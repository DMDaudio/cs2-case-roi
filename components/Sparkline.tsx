import type { HistoryPoint } from "@/lib/history/types";

export function Sparkline({
  points,
  width = 96,
  height = 28,
}: {
  points: HistoryPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <span className="text-[10px] text-ink-faint">no history</span>;
  }
  const prices = points.map((p) => p.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const d = points
    .map((pt, i) => {
      const x = i * stepX;
      const y = height - ((pt.p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={up ? "#3fbf7f" : "#eb4b4b"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
