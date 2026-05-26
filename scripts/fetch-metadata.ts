/**
 * Pulls case + skin metadata from ByMykel/CSGO-API and normalises it
 * into the shape lib/metadata/types.ts expects, then writes to
 * data/cases.json.
 *
 * Run with:   npm run fetch-metadata
 *
 * The output is committed to git so the live app doesn't depend on
 * ByMykel being reachable at request time.
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

const SRC_BASE =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
const CRATES_URL = `${SRC_BASE}/crates/cases.json`;
const SKINS_URL = `${SRC_BASE}/skins.json`;

type RawCrate = {
  id: string;
  name: string;
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
  name: string; // e.g. "AK-47 | Redline"
  wears?: { name: string }[];
  stattrak?: boolean;
  souvenir?: boolean;
  image?: string | null;
};

const RARITY_FROM_ID: Record<string, Rarity> = {
  rarity_mil_spec_weapon: "mil_spec",
  rarity_restricted_weapon: "restricted",
  rarity_classified_weapon: "classified",
  rarity_covert_weapon: "covert",
  rarity_rare_weapon: "rare_special",
  rarity_ancient_weapon: "covert",
  // gloves / knives often come back as "extraordinary" / "contraband"
  rarity_ancient: "rare_special",
  rarity_contraband: "rare_special",
};

const RARITY_FROM_NAME: Record<string, Rarity> = {
  "Mil-Spec Grade": "mil_spec",
  Restricted: "restricted",
  Classified: "classified",
  Covert: "covert",
  "Extraordinary": "rare_special",
  "Contraband": "rare_special",
};

function inferRarity(c: RawContent): Rarity | null {
  if (c.rarity?.id && RARITY_FROM_ID[c.rarity.id]) {
    return RARITY_FROM_ID[c.rarity.id];
  }
  if (c.rarity?.name && RARITY_FROM_NAME[c.rarity.name]) {
    return RARITY_FROM_NAME[c.rarity.name];
  }
  return null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "user-agent": "cs2-case-roi/0.1" } });
  if (!res.ok) {
    throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function normaliseWears(raw: RawSkin | undefined): Wear[] {
  if (!raw?.wears) return WEARS;
  const set = new Set<Wear>();
  for (const w of raw.wears) {
    if ((WEARS as readonly string[]).includes(w.name)) {
      set.add(w.name as Wear);
    }
  }
  return WEARS.filter((w) => set.has(w));
}

async function main() {
  console.log("Fetching crates list…");
  const crates = await fetchJSON<RawCrate[]>(CRATES_URL);
  console.log(`  → ${crates.length} crates`);

  console.log("Fetching skins index (this is ~5MB)…");
  const skins = await fetchJSON<RawSkin[]>(SKINS_URL);
  console.log(`  → ${skins.length} skins`);

  // Build a lookup: base name → skin metadata
  const skinByName = new Map<string, RawSkin>();
  for (const s of skins) skinByName.set(s.name, s);

  const out: CaseMeta[] = [];

  for (const crate of crates) {
    // Only weapon cases (need a key). ByMykel marks souvenir / sticker
    // capsules in their crate-type taxonomy; we filter to "cases" only
    // upstream by virtue of using crates/cases.json — but defensively
    // skip empties.
    const contains = crate.contains ?? [];
    const containsRare = crate.contains_rare ?? [];
    if (contains.length === 0 && containsRare.length === 0) continue;

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

    if (items.length === 0) continue; // not a weapon case

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

  const payload: CasesFile = {
    generatedAt: new Date().toISOString(),
    source: "https://github.com/ByMykel/CSGO-API",
    cases: out,
  };

  const outDir = path.resolve(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cases.json");
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${out.length} cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
