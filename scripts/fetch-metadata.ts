/**
 * Pulls full CS2 weapon-case metadata from ByMykel/CSGO-API and
 * normalises it into the shape lib/metadata/types.ts expects, then
 * writes data/cases.json.
 *
 * Run with:   npm run fetch-metadata
 *
 * The output is committed to git so the live app doesn't depend on
 * ByMykel being reachable at request time.
 *
 * Scope: only `type === "Case"` weapon cases (~42 as of writing).
 * Sticker capsules, autograph capsules, and souvenir packages use a
 * different rarity model and aren't compatible with the current EV
 * calculator; they're skipped for now.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  type CaseMeta,
  type CaseItem,
  type CasesFile,
  type Rarity,
  type Wear,
  WEARS,
} from "../lib/metadata/types";

const BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
const CRATES_URL = `${BASE}/crates.json`;
const SKINS_URL = `${BASE}/skins.json`;

type RawCrate = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  image: string | null;
  first_sale_date: string | null;
  contains: RawContent[] | null;
  contains_rare: RawContent[] | null;
};

type RawContent = {
  id: string;
  name: string;
  rarity?: { id?: string; name?: string };
  paint_index?: string | null;
  image?: string | null;
};

type RawSkin = {
  id: string;
  name: string;
  wears?: { name: string }[] | null;
  stattrak?: boolean;
  souvenir?: boolean;
  image?: string | null;
};

/**
 * ByMykel's rarity_id → our internal Rarity.
 *
 * The id naming in CSGO/CS2 is historical and a bit misleading:
 *   rarity_rare_weapon       = Mil-Spec   (blue)
 *   rarity_mythical_weapon   = Restricted (purple)
 *   rarity_legendary_weapon  = Classified (pink)
 *   rarity_ancient_weapon    = Covert     (red)
 *   rarity_immortal          = Rare Special (gold — knife/glove)
 *   rarity_contraband        = Rare Special (legacy)
 */
const RARITY_FROM_ID: Record<string, Rarity> = {
  rarity_rare_weapon: "mil_spec",
  rarity_mythical_weapon: "restricted",
  rarity_legendary_weapon: "classified",
  rarity_ancient_weapon: "covert",
  rarity_immortal: "rare_special",
  rarity_contraband: "rare_special",
  rarity_ancient: "rare_special",
};

const RARITY_FROM_NAME: Record<string, Rarity> = {
  "Mil-Spec Grade": "mil_spec",
  Restricted: "restricted",
  Classified: "classified",
  Covert: "covert",
  Extraordinary: "rare_special",
  Contraband: "rare_special",
};

function inferRarity(c: RawContent): Rarity | null {
  if (c.rarity?.id && RARITY_FROM_ID[c.rarity.id]) return RARITY_FROM_ID[c.rarity.id];
  if (c.rarity?.name && RARITY_FROM_NAME[c.rarity.name]) return RARITY_FROM_NAME[c.rarity.name];
  return null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "user-agent": "cs2-case-roi/0.1" } });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return (await res.json()) as T;
}

function normaliseWears(skin: RawSkin | undefined): Wear[] {
  if (!skin?.wears) return [...WEARS];
  const set = new Set<Wear>();
  for (const w of skin.wears) {
    if ((WEARS as readonly string[]).includes(w.name)) set.add(w.name as Wear);
  }
  // If ByMykel reports no wears at all, fall back to all wears (knives often have empty entry)
  return set.size > 0 ? WEARS.filter((w) => set.has(w)) : [...WEARS];
}

async function main() {
  console.log("Fetching ByMykel crates.json…");
  const allCrates = await fetchJSON<RawCrate[]>(CRATES_URL);
  console.log(`  → ${allCrates.length} crates`);

  const weaponCases = allCrates.filter((c) => c.type === "Case");
  console.log(`  → ${weaponCases.length} weapon cases`);

  console.log("Fetching skins.json (~5MB)…");
  const skins = await fetchJSON<RawSkin[]>(SKINS_URL);
  console.log(`  → ${skins.length} skins`);
  const skinByName = new Map<string, RawSkin>();
  for (const s of skins) skinByName.set(s.name, s);

  const out: CaseMeta[] = [];

  for (const crate of weaponCases) {
    const contains = crate.contains ?? [];
    const containsRare = crate.contains_rare ?? [];

    const toItem = (c: RawContent): CaseItem | null => {
      const rarity = inferRarity(c);
      if (!rarity) return null;
      const skin = skinByName.get(c.name);
      return {
        baseName: c.name,
        rarity,
        availableWears: normaliseWears(skin),
        statTrakAvailable: skin?.stattrak ?? true,
        imageUrl: c.image ?? skin?.image ?? null,
      };
    };

    const items = contains.map(toItem).filter((x): x is CaseItem => x != null);
    const rare = containsRare.map(toItem).filter((x): x is CaseItem => x != null);

    // Knives often miss a rarity tag — promote any item in contains_rare to rare_special.
    for (const r of rare) r.rarity = "rare_special";

    if (items.length === 0) continue;

    out.push({
      id: crate.id,
      name: crate.name,
      imageUrl: crate.image,
      releaseDate: crate.first_sale_date,
      requiresKey: true,
      keyMarketHashName: `${crate.name} Key`,
      caseMarketHashName: crate.name,
      contents: items,
      rareSpecial: rare,
    });
  }

  // Sort by release date (newest first) so the freshly hyped cases show up first
  out.sort((a, b) => {
    const at = a.releaseDate ? Date.parse(a.releaseDate.replace(/\//g, "-")) : 0;
    const bt = b.releaseDate ? Date.parse(b.releaseDate.replace(/\//g, "-")) : 0;
    return bt - at;
  });

  const payload: CasesFile = {
    generatedAt: new Date().toISOString(),
    source: "https://github.com/ByMykel/CSGO-API",
    cases: out,
  };

  const outDir = path.resolve(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cases.json");
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${out.length} weapon cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
