import Link from "next/link";
import Image from "next/image";
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
        "group panel relative block overflow-hidden transition-all",
        "hover:border-accent-orange/40 hover:shadow-glow"
      )}
    >
      <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />

      {/* Hero image */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-b from-bg-elevated to-bg-raised">
        {data.caseImageUrl ? (
          <Image
            src={data.caseImageUrl}
            alt={data.caseName}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-faint">
            no image
          </div>
        )}
        {rank != null && (
          <div className="num absolute left-2 top-2 rounded bg-bg-base/80 px-1.5 py-0.5 text-[10px] text-ink-dim ring-1 ring-bg-border">
            #{rank}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <EVBadge evPct={data.evPct} size="sm" />
        </div>
      </div>

      <div className="relative p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-ink">{data.caseName}</h3>
          {data.unpricedItems > 0 && (
            <span className="chip border-warn/40 bg-warn/5 text-warn">
              {data.unpricedItems} ?
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-ink-faint">Cost / open</div>
            <div className="num mt-0.5 text-ink">{formatUSD(data.totalCostPerOpen)}</div>
            <div className="num mt-0.5 text-[10px] text-ink-faint">
              {formatUSD(data.caseUnitPrice)} case + {formatUSD(data.keyUnitPrice)} key
            </div>
          </div>
          <div className="text-right">
            <div className="text-ink-faint">Expected return</div>
            <div className="num mt-0.5 text-ink">{formatUSD(data.evGross)}</div>
            <div className="num mt-0.5 text-[10px] text-ink-faint">per open</div>
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
                <span className="ml-1 text-[10px] text-ink-faint">
                  σ/μ {data.lotteryScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
