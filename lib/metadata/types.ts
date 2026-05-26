export type Rarity =
  | "mil_spec"
  | "restricted"
  | "classified"
  | "covert"
  | "rare_special";

export const RARITY_ORDER: Rarity[] = [
  "mil_spec",
  "restricted",
  "classified",
  "covert",
  "rare_special",
];

export const RARITY_LABEL: Record<Rarity, string> = {
  mil_spec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  rare_special: "Rare Special (Knife / Glove)",
};

/** All possible wear bands a CS2 skin can have. */
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
  /** Base name without wear suffix, e.g. "AK-47 | Case Hardened" */
  baseName: string;
  rarity: Rarity;
  /** Which wears actually exist for this skin (subset of WEARS). */
  availableWears: Wear[];
  statTrakAvailable: boolean;
  imageUrl: string | null;
};

export type CaseMeta = {
  id: string;
  name: string;
  imageUrl: string | null;
  releaseDate: string | null;
  requiresKey: boolean;
  /** Steam market_hash_name of the matching key, if any. */
  keyMarketHashName: string | null;
  /** Steam market_hash_name of the case container itself. */
  caseMarketHashName: string;
  /** Non-knife skins. */
  contents: CaseItem[];
  /** Knives / gloves (the "rare special" tier). */
  rareSpecial: CaseItem[];
};

export type CasesFile = {
  generatedAt: string;
  source: string;
  cases: CaseMeta[];
};
