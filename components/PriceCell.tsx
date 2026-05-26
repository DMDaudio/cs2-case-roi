import { formatUSD } from "@/lib/utils";

type Props = {
  value: number | null;
  hint?: string;
};

export function PriceCell({ value, hint }: Props) {
  return (
    <span className="num text-right tabular-nums" title={hint}>
      {value != null ? (
        <>
          <span className="text-ink-faint">$</span>
          <span className="text-ink">
            {Number(value.toFixed(value >= 1000 ? 0 : 2)).toLocaleString("en-US", {
              minimumFractionDigits: value >= 1000 ? 0 : 2,
              maximumFractionDigits: value >= 1000 ? 0 : 2,
            })}
          </span>
        </>
      ) : (
        <span className="text-ink-faint">—</span>
      )}
    </span>
  );
}
