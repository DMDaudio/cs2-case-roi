import type { SourceName } from "@/lib/prices/types";
import { cn, formatUSD } from "@/lib/utils";

const COLORS: Record<SourceName, string> = {
  steam: "border-[#5e98d9]/40 text-[#a9c8eb] bg-[#5e98d9]/10",
  csfloat: "border-[#de9b35]/40 text-[#f1cc88] bg-[#de9b35]/10",
  skinport: "border-[#3fbf7f]/40 text-[#8be3b6] bg-[#3fbf7f]/10",
};

const LABELS: Record<SourceName, string> = {
  steam: "Steam",
  csfloat: "CSFloat",
  skinport: "Skinport",
};

export function SourceBadge({
  source,
  price,
}: {
  source: SourceName;
  price: number | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono tabular-nums",
        COLORS[source]
      )}
      title={`${LABELS[source]} lowest ask`}
    >
      <span className="opacity-70">{LABELS[source]}</span>
      <span>{price != null ? formatUSD(price) : "—"}</span>
    </span>
  );
}
