import { cn, formatPct, formatRatioPct, unboxingRoi } from "@/lib/utils";

type Props = {
  evPct: number | null;
  size?: "sm" | "md" | "lg";
  /** Show the net % as a secondary line. Ignored for size "sm". */
  showNet?: boolean;
};

/**
 * Primary number is the **unboxing ROI** (share of spend returned, e.g. 47%).
 * Secondary line is the **net** ROI (e.g. −53%). Both describe the same EV:
 * gross = net + 100%. Profit (green) iff net ≥ 0 iff gross ≥ 100%.
 */
export function EVBadge({ evPct, size = "md", showNet = true }: Props) {
  const isProfit = evPct != null && evPct >= 0;
  const isUnknown = evPct == null;
  const gross = unboxingRoi(evPct);

  const color = isUnknown
    ? "text-ink-faint bg-bg-elevated border-bg-border"
    : isProfit
    ? "text-good bg-good/10 border-good/30"
    : "text-bad bg-bad/10 border-bad/30";

  const sizeCls =
    size === "sm" ? "text-xs px-1.5 py-0.5" :
    size === "lg" ? "text-base px-3 py-1.5" :
    "text-sm px-2 py-1";

  if (size === "sm" || !showNet) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border font-mono tabular-nums font-semibold",
          sizeCls,
          color
        )}
        title={`Unboxing ROI — you get back ${formatRatioPct(gross)} of your spend on average (net ${formatPct(evPct)})`}
      >
        {formatRatioPct(gross)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex flex-col items-end rounded-md border font-mono tabular-nums leading-tight",
        sizeCls,
        color
      )}
      title={`Unboxing ROI ${formatRatioPct(gross)} (net ${formatPct(evPct)}) — share of spend returned per open`}
    >
      <span className="font-semibold">
        {formatRatioPct(gross)}
        <span className="ml-1 text-[0.7em] font-normal opacity-70">ROI</span>
      </span>
      <span className="text-[0.7em] font-normal opacity-70">{formatPct(evPct)} net</span>
    </span>
  );
}
