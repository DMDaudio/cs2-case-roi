export type CaseKind =
  | "weapon_case"
  | "sticker_capsule"
  | "autograph_capsule"
  | "souvenir_package";

export const CASE_KIND_LABEL: Record<CaseKind, string> = {
  weapon_case: "Weapon Case",
  sticker_capsule: "Sticker Capsule",
  autograph_capsule: "Autograph Capsule",
  souvenir_package: "Souvenir Package",
};

/**
 * Unified rarity tag across every container kind. Not every kind uses
 * every tag — see {@link lib/ev/odds.ts} for the per-kind probability map.
 *
 *   weapon cases     → mil_spec / restricted / classified / covert / rare_special
 *   souvenir packs   → consumer / industrial / mil_spec / restricted / classified
 *   sticker / auto   → high_grade / remarkable / exotic / extraordinary
 */
export type Rarity =
  // weapon-case tiers (also used by souvenir mid-tiers)
  | "mil_spec"
  | "restricted"
  | "classified"
  | "covert"
  | "rare_special"
  // sticker / autograph capsule tiers
  | "high_grade"
  | "remarkable"
  | "exotic"
  | "extraordinary"
  // souvenir-package additional low tiers
  | "consumer"
  | "industrial";

export const RARITY_ORDER: Rarity[] = [
  // ordered low → high for consistent rendering across all kinds
  "consumer",
  "industrial",
  "mil_spec",
  "restricted",
  "classified",
  "covert",
  "rare_special",
  "high_grade",
  "remarkable",
  "exotic",
  "extraordinary",
];

export const RARITY_LABEL: Record<Rarity, string> = {
  consumer: "Consumer Grade",
  industrial: "Industrial Grade",
  mil_spec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  rare_special: "Rare Special (Knife / Glove)",
  high_grade: "High Grade",
  remarkable: "Remarkable (Holo)",
  exotic: "Exotic (Foil)",
  extraordinary: "Extraordinary (Gold)",
};

/** All possible wear bands a CS2 weapon skin can have. */
export type Wear =
  | "Factory New"
  | "Minimal Wear"
  | "Field-Tested"
  | "Well-Worn"
  | "Battle-Scarred";

export const WEARS: Wear[] = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

export type CaseItem = {
  /**
   * The full market_hash_name **prefix** for this item — i.e. the wear-less name
   * exactly as it appears on Steam Market.
   *
   *   weapon skin    → "AK-47 | Redline"
   *   souvenir skin  → "Souvenir AK-47 | Safari Mesh"
   *   sticker        → "Sticker | Lucky 13"
   *   autograph      → "Sticker | Xizt (Foil) | Cologne 2015"
   *
   * For wear-bearing items, append " (<wear>)" to get the full market name.
   * For wearless items (capsules), the marketHashName *is* baseName.
   */
  baseName: string;
  rarity: Rarity;
  /** Empty array = no wear axis (capsules). */
  availableWears: Wear[];
  /** False for souvenirs and capsules. */
  statTrakAvailable: boolean;
  imageUrl: string | null;
};

export type CaseMeta = {
  id: string;
  name: string;
  kind: CaseKind;
  imageUrl: string | null;
  releaseDate: string | null;
  requiresKey: boolean;
  /** Steam market_hash_name of the matching key, if any. */
  keyMarketHashName: string | null;
  /** Steam market_hash_name of the container itself. */
  caseMarketHashName: string;
  /** Non-knife items. */
  contents: CaseItem[];
  /** Knives / gloves for weapon cases. Empty for other kinds. */
  rareSpecial: CaseItem[];
};

export type CasesFile = {
  generatedAt: string;
  source: string;
  cases: CaseMeta[];
};
