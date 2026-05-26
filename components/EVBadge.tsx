import { cn, formatPct } from "@/lib/utils";

type Props = {
  evPct: number | null;
  size?: "sm" | "md" | "lg";
};

export function EVBadge({ evPct, size = "md" }: Props) {
  const isPositive = evPct != null && evPct >= 0;
  const isUnknown = evPct == null;

  const color = isUnknown
    ? "text-ink-faint bg-bg-elevated border-bg-border"
    : isPositive
    ? "text-good bg-good/10 border-good/30"
    : "text-bad bg-bad/10 border-bad/30";

  const sizeCls =
    size === "sm" ? "text-xs px-1.5 py-0.5" :
    size === "lg" ? "text-base px-3 py-1.5" :
    "text-sm px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono tabular-nums font-semibold",
        sizeCls,
        color
      )}
      title="Expected return vs cost (case + key)"
    >
      {formatPct(evPct)}
    </span>
  );
}
