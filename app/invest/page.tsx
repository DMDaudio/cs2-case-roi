import Link from "next/link";
import Image from "next/image";
import { getInvestRows } from "@/lib/invest/service";
import { Sparkline } from "@/components/Sparkline";
import { VerdictChip } from "@/components/VerdictChip";
import { formatUSD, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const rows = await getInvestRows();
  rows.sort((a, b) => (b.change90d ?? -Infinity) - (a.change90d ?? -Infinity));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
          buy &amp; hold
        </div>
        <h1 className="mt-1 text-3xl font-bold text-ink">Which containers are appreciating?</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-dim">
          Ranked by 90-day price change. Cases with frozen supply (rising price, falling volume)
          historically keep climbing. Not investment advice.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-normal">Container</th>
              <th className="px-4 py-3 text-right font-normal">Price</th>
              <th className="px-4 py-3 text-right font-normal">30d</th>
              <th className="px-4 py-3 text-right font-normal">90d</th>
              <th className="px-4 py-3 text-right font-normal">1y</th>
              <th className="px-4 py-3 font-normal">Trend</th>
              <th className="px-4 py-3 text-right font-normal">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.caseId} className="border-t border-bg-border/60 hover:bg-bg-elevated/30">
                <td className="px-4 py-2">
                  <Link
                    href={`/case/${encodeURIComponent(r.caseId)}`}
                    className="flex items-center gap-3 hover:text-accent-orange"
                  >
                    {r.caseImageUrl && (
                      <div className="relative h-8 w-12 shrink-0">
                        <Image src={r.caseImageUrl} alt={r.caseName} fill sizes="48px" className="object-contain" />
                      </div>
                    )}
                    <span className="truncate">{r.caseName}</span>
                    {r.frozenSupply && (
                      <span className="chip border-accent-cyan/40 text-accent-cyan">frozen supply</span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right num">{formatUSD(r.currentPrice)}</td>
                <Change v={r.change30d} />
                <Change v={r.change90d} />
                <Change v={r.change365d} />
                <td className="px-4 py-2">
                  <Sparkline points={r.spark} />
                </td>
                <td className="px-4 py-2 text-right">
                  <VerdictChip verdict={r.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Change({ v }: { v: number | null }) {
  const cls = v == null ? "text-ink-faint" : v >= 0 ? "text-good" : "text-bad";
  return <td className={`px-4 py-2 text-right num ${cls}`}>{formatPct(v)}</td>;
}
