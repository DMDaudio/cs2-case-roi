import Link from "next/link";
import type { CaseSummary } from "@/lib/ev/service";
import { EVBadge } from "./EVBadge";
import { PriceCell } from "./PriceCell";
import { cn, formatUSD } from "@/lib/utils";

type Props = {
  data: CaseSummary;
  rank?: number;
};

export function CaseCard({ data, rank }: Props) {
  const lottery =
    data.lotteryScore != null
      ? data.lotteryScore > 4
        ? { label: "Lottery", cls: "text-warn" }
        : data.lotteryScore > 2
        ? { label: "Spiky", cls: "text-accent-orange" }
        : { label: "Grindable", cls: "text-good" }
      : null;

  return (
    <Link
      href={`/case/${encodeURIComponent(data.caseId)}`}
      className={cn(
        "group panel relative block overflow-hidden p-4 transition-all",
        "hover:border-accent-orange/40 hover:shadow-glow"
      )}
    >
      <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-faint">
            {rank != null && <span className="num">#{rank}</span>}
            <span>Case</span>
            {data.unpricedItems > 0 && (
              <span className="chip text-warn border-warn/40 bg-warn/5">
                {data.unpricedItems} unpriced
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-ink">{data.caseName}</h3>
        </div>
        <EVBadge evPct={data.evPct} />
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-ink-faint">Cost / open</div>
          <div className="num mt-0.5 text-ink">
            {formatUSD(data.totalCostPerOpen)}
            <span className="ml-1 text-ink-faint">
              ({formatUSD(data.caseUnitPrice)} + {formatUSD(data.keyUnitPrice)})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-ink-faint">Expected return</div>
          <div className="num mt-0.5 text-ink">{formatUSD(data.evGross)}</div>
        </div>
        <div>
          <div className="text-ink-faint">Net EV</div>
          <div className="num mt-0.5">
            <PriceCell value={data.evNet} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-ink-faint">Risk</div>
          <div className={cn("num mt-0.5", lottery?.cls ?? "text-ink-dim")}>
            {lottery?.label ?? "—"}
            {data.lotteryScore != null && (
              <span className="ml-1 text-ink-faint">σ/μ {data.lotteryScore.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
