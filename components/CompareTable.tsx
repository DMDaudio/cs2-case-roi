"use client";

import { useMemo } from "react";
import type { CaseEV } from "@/lib/ev/calculator";
import { PriceCell } from "./PriceCell";
import { formatUSD, formatPct, formatRatioPct, unboxingRoi, cn } from "@/lib/utils";
import { RARITY_ORDER, RARITY_LABEL } from "@/lib/metadata/types";
import { RarityBar } from "./RarityBar";

export function CompareTable({ cases }: { cases: CaseEV[] }) {
  const bestEv = useMemo(() => {
    let best = -Infinity;
    let bestId: string | null = null;
    for (const c of cases) {
      if (c.evPct != null && c.evPct > best) {
        best = c.evPct;
        bestId = c.caseId;
      }
    }
    return bestId;
  }, [cases]);

  if (cases.length === 0) {
    return <div className="panel p-10 text-center text-ink-dim">Pick at least one case.</div>;
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-bg-border text-left text-xs uppercase tracking-wider text-ink-faint">
            <th className="px-4 py-3 font-normal">Metric</th>
            {cases.map((c) => (
              <th
                key={c.caseId}
                className={cn(
                  "px-4 py-3 text-left font-normal",
                  bestEv === c.caseId && "text-accent-orange"
                )}
              >
                {c.caseName}
                {bestEv === c.caseId && <span className="ml-1 text-[10px]">★ best EV</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="Unboxing ROI">
            {cases.map((c) => (
              <td
                key={c.caseId}
                className={cn(
                  "px-4 py-2 num font-semibold",
                  c.evPct == null ? "text-ink-faint" : c.evPct >= 0 ? "text-good" : "text-bad"
                )}
              >
                {formatRatioPct(unboxingRoi(c.evPct))}
              </td>
            ))}
          </Row>
          <Row label="Net ROI">
            {cases.map((c) => (
              <td
                key={c.caseId}
                className={cn(
                  "px-4 py-2 num",
                  c.evPct == null ? "text-ink-faint" : c.evPct >= 0 ? "text-good" : "text-bad"
                )}
              >
                {formatPct(c.evPct)}
              </td>
            ))}
          </Row>
          <Row label="Net EV / open">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                <PriceCell value={c.evNet} />
              </td>
            ))}
          </Row>
          <Row label="Cost / open">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {formatUSD(c.totalCostPerOpen)}
              </td>
            ))}
          </Row>
          <Row label="Expected return">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {formatUSD(c.evGross)}
              </td>
            ))}
          </Row>
          <Row label="σ (volatility)">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {formatUSD(c.stdDev)}
              </td>
            ))}
          </Row>
          <Row label="σ / μ (lottery)">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {c.lotteryScore != null ? c.lotteryScore.toFixed(2) : "—"}
              </td>
            ))}
          </Row>
          <Row label="Total items">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {c.totalItems}
              </td>
            ))}
          </Row>
          <Row label="Unpriced">
            {cases.map((c) => (
              <td key={c.caseId} className="px-4 py-2 num">
                {c.unpricedItems}
              </td>
            ))}
          </Row>

          {RARITY_ORDER.map((r) => (
            <Row key={r} label={RARITY_LABEL[r]}>
              {cases.map((c) => {
                const t = c.tiers.find((x) => x.rarity === r);
                return (
                  <td key={c.caseId} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <RarityBar rarity={r} />
                      {t ? (
                        <span className="num text-ink-dim">
                          <PriceCell value={t.averageExpectedPrice} />
                          <span className="ml-1 text-[10px] text-ink-faint">
                            ({formatPct(t.probability, 2)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </Row>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-bg-border/60">
      <td className="px-4 py-2 text-xs uppercase tracking-wider text-ink-faint">{label}</td>
      {children}
    </tr>
  );
}
