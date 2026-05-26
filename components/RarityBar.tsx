import type { Rarity } from "@/lib/metadata/types";
import { cn } from "@/lib/utils";

const RARITY_BG: Record<Rarity, string> = {
  mil_spec: "bg-rarity-mil_spec",
  restricted: "bg-rarity-restricted",
  classified: "bg-rarity-classified",
  covert: "bg-rarity-covert",
  rare_special: "bg-rarity-rare_special",
};

export function RarityBar({ rarity, className }: { rarity: Rarity; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-sm", RARITY_BG[rarity], className)} />;
}

export function RarityStripe({ rarity }: { rarity: Rarity }) {
  return <span className={cn("block h-1 w-full rounded-t-md", RARITY_BG[rarity])} />;
}
