import type { Rarity } from "@/lib/metadata/types";
import { cn } from "@/lib/utils";

/**
 * Tailwind needs every class name as a literal somewhere in the source
 * for its JIT scan; we list them inline rather than build the class via
 * template literals. Order matches RARITY_ORDER for consistency.
 */
const RARITY_BG: Record<Rarity, string> = {
  consumer: "bg-[#b0c3d9]",
  industrial: "bg-[#5e98d9]",
  mil_spec: "bg-rarity-mil_spec",
  restricted: "bg-rarity-restricted",
  classified: "bg-rarity-classified",
  covert: "bg-rarity-covert",
  rare_special: "bg-rarity-rare_special",
  // sticker tiers reuse the weapon-case palette so colors stay familiar
  high_grade: "bg-rarity-mil_spec",
  remarkable: "bg-rarity-restricted",
  exotic: "bg-rarity-classified",
  extraordinary: "bg-rarity-rare_special",
};

export function RarityBar({ rarity, className }: { rarity: Rarity; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-sm", RARITY_BG[rarity], className)} />;
}

export function RarityStripe({ rarity }: { rarity: Rarity }) {
  return <span className={cn("block h-1 w-full rounded-t-md", RARITY_BG[rarity])} />;
}
