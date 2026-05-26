/**
 * Pulls full CS2 container metadata from ByMykel/CSGO-API and
 * normalises it into the shape lib/metadata/types.ts expects.
 *
 * Scope: weapon cases, sticker capsules, autograph capsules, and
 * souvenir packages. Each kind has its own rarity model and pricing
 * axes — see lib/ev/odds.ts.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  type CaseMeta,
  type CaseItem,
  type CasesFile,
  type CaseKind,
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

const KIND_BY_TYPE: Record<string, CaseKind> = {
  Case: "weapon_case",
  "Sticker Capsule": "sticker_capsule",
  "Autograph Capsule": "autograph_capsule",
  Souvenir: "souvenir_package",
};

// Universal id → Rarity. Same id can mean different tiers depending on container kind,
// so we resolve in two passes: this first map handles weapon-specific ids; the second
// fallback re-maps based on the kind for non-weapon contexts.
const RARITY_FROM_ID_WEAPON: Record<string, Rarity> = {
  rarity_common_weapon: "consumer",
  rarity_uncommon_weapon: "industrial",
  rarity_rare_weapon: "mil_spec",
  rarity_mythical_weapon: "restricted",
  rarity_legendary_weapon: "classified",
  rarity_ancient_weapon: "covert",
  rarity_immortal: "rare_special",
  rarity_contraband: "rare_special",
};

const RARITY_FROM_ID_STICKER: Record<string, Rarity> = {
  rarity_rare: "high_grade",
  rarity_mythical: "remarkable",
  rarity_legendary: "exotic",
  rarity_ancient: "extraordinary",
};

function inferRarity(c: RawContent, kind: CaseKind): Rarity | null {
  const id = c.rarity?.id;
  if (!id) return null;
  if (kind === "weapon_case" || kind === "souvenir_package") {
    return RARITY_FROM_ID_WEAPON[id] ?? null;
  }
  // sticker / autograph
  return RARITY_FROM_ID_STICKER[id] ?? null;
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
  return set.size > 0 ? WEARS.filter((w) => set.has(w)) : [...WEARS];
}

/**
 * Compute the Steam Market name prefix (wear-less) for an item.
 *
 *   weapon skin    → "AK-47 | Redline"
 *   souvenir skin  → "Souvenir AK-47 | Safari Mesh"
 *   sticker / auto → "Sticker | <name>"
 */
function baseMarketName(c: RawContent, kind: CaseKind): string {
  switch (kind) {
    case "weapon_case":
      return c.name;
    case "souvenir_package":
      return `Souvenir ${c.name}`;
    case "sticker_capsule":
    case "autograph_capsule":
      // Some ByMykel entries already include "Sticker | "; most don't.
      return c.name.startsWith("Sticker | ") ? c.name : `Sticker | ${c.name}`;
  }
}

async function main() {
  console.log("Fetching ByMykel crates.json…");
  const allCrates = await fetchJSON<RawCrate[]>(CRATES_URL);
  console.log(`  → ${allCrates.length} total crates`);

  const wanted = allCrates.filter((c) => c.type && c.type in KIND_BY_TYPE);
  const byKind: Record<CaseKind, number> = {
    weapon_case: 0,
    sticker_capsule: 0,
    autograph_capsule: 0,
    souvenir_package: 0,
  };

  console.log("Fetching skins.json (~5MB)…");
  const skins = await fetchJSON<RawSkin[]>(SKINS_URL);
  const skinByName = new Map<string, RawSkin>();
  for (const s of skins) skinByName.set(s.name, s);

  const out: CaseMeta[] = [];

  for (const crate of wanted) {
    const kind = KIND_BY_TYPE[crate.type as string];
    const contains = crate.contains ?? [];
    const containsRare = crate.contains_rare ?? [];

    const toItem = (c: RawContent, forceRare: boolean): CaseItem | null => {
      let rarity: Rarity | null = forceRare ? "rare_special" : inferRarity(c, kind);
      if (!rarity) return null;

      // Wear / StatTrak axes apply only to weapon-skin items
      const wears: Wear[] =
        kind === "weapon_case" || kind === "souvenir_package"
          ? normaliseWears(skinByName.get(c.name))
          : [];

      const statTrak =
        kind === "weapon_case" && (skinByName.get(c.name)?.stattrak ?? true);

      return {
        baseName: baseMarketName(c, kind),
        rarity,
        availableWears: wears,
        statTrakAvailable: !!statTrak,
        imageUrl: c.image ?? skinByName.get(c.name)?.image ?? null,
      };
    };

    const items = contains.map((c) => toItem(c, false)).filter((x): x is CaseItem => x != null);
    const rare =
      kind === "weapon_case"
        ? containsRare.map((c) => toItem(c, true)).filter((x): x is CaseItem => x != null)
        : [];

    if (items.length === 0 && rare.length === 0) continue;

    out.push({
      id: crate.id,
      name: crate.name,
      kind,
      imageUrl: crate.image,
      releaseDate: crate.first_sale_date,
      requiresKey: kind === "weapon_case",
      keyMarketHashName: kind === "weapon_case" ? `${crate.name} Key` : null,
      caseMarketHashName: crate.name,
      contents: items,
      rareSpecial: rare,
    });

    byKind[kind]++;
  }

  // Sort: weapon cases first (most interesting), then by release date desc
  const KIND_PRIORITY: Record<CaseKind, number> = {
    weapon_case: 0,
    sticker_capsule: 1,
    souvenir_package: 2,
    autograph_capsule: 3,
  };
  out.sort((a, b) => {
    const dk = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (dk !== 0) return dk;
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
  console.log(`Wrote ${out.length} containers → ${outPath}`);
  console.log("  breakdown:", byKind);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
