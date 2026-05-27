import Image from "next/image";
import type { CaseEV } from "@/lib/ev/calculator";
import type { SourceName } from "@/lib/prices/types";
import { EVBadge } from "./EVBadge";
import { RarityBar } from "./RarityBar";
import { PriceCell } from "./PriceCell";
import { RefreshButton } from "./RefreshButton";
import { RARITY_LABEL } from "@/lib/metadata/types";
import { cn, formatUSD, formatPct } from "@/lib/utils";
import { PriceChart } from "./PriceChart";
import type { HistoryPoint } from "@/lib/history/types";

export function CaseDetailView({
  ev,
  sourceStatus,
  history,
}: {
  ev: CaseEV;
  sourceStatus: Record<SourceName, "ok" | "down" | "skipped">;
  history: HistoryPoint[];
}) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="panel-elevated relative overflow-hidden p-6">
        <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {ev.caseImageUrl && (
              <div className="relative h-28 w-28 shrink-0 rounded-lg bg-bg-elevated p-2 ring-1 ring-bg-border">
                <Image
                  src={ev.caseImageUrl}
                  alt={ev.caseName}
                  fill
                  sizes="112px"
                  className="object-contain p-1"
                />
              </div>
            )}
            <div>
            <div className="text-xs uppercase tracking-[0.25em] text-ink-faint">Case</div>
            <h1 className="mt-1 text-3xl font-bold text-ink">{ev.caseName}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip">
                Cost / open <span className="ml-1 num text-ink">{formatUSD(ev.totalCostPerOpen)}</span>
              </span>
              <span className="chip">
                Case <span className="ml-1 num text-ink">{formatUSD(ev.caseUnitPrice)}</span>
              </span>
              <span className="chip">
                Key <span className="ml-1 num text-ink">{formatUSD(ev.keyUnitPrice)}</span>
              </span>
              {ev.lotteryScore != null && (
                <span className="chip">σ/μ <span className="ml-1 num text-ink">{ev.lotteryScore.toFixed(2)}</span></span>
              )}
            </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <EVBadge evPct={ev.evPct} size="lg" />
            <div className="num text-sm text-ink-dim">
              expected {formatUSD(ev.evGross)} · net {formatUSD(ev.evNet)}
            </div>
            <RefreshButton caseId={ev.caseId} />
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2 text-[11px]">
          {(["steam", "csfloat", "skinport"] as SourceName[]).map((s) => (
            <span
              key={s}
              className={cn(
                "chip",
                sourceStatus[s] === "down" && "border-bad/40 text-bad",
                sourceStatus[s] === "ok" && "border-good/30 text-good/90"
              )}
            >
              {s} · {sourceStatus[s]}
            </span>
          ))}
          {ev.unpricedItems > 0 && (
            <span className="chip border-warn/40 text-warn">
              {ev.unpricedItems} of {ev.totalItems} items unpriced — EV is a lower bound
            </span>
          )}
        </div>
      </div>

      <PriceChart points={history} />

      {/* Tiers */}
      <div className="space-y-4">
        {ev.tiers.map((tier) => (
          <div key={tier.rarity} className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-bg-border bg-bg-elevated/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <RarityBar rarity={tier.rarity} className="h-3 w-3" />
                <div>
                  <div className="text-sm font-semibold text-ink">{RARITY_LABEL[tier.rarity]}</div>
                  <div className="text-xs text-ink-faint">
                    {formatPct(tier.probability, 2)} drop chance · {tier.itemCount} items ·{" "}
                    {formatPct(tier.perItemProbability, 3)} per item
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-faint">Avg expected</div>
                <div className="num text-sm text-ink">
                  <PriceCell value={tier.averageExpectedPrice} />
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-4 py-2 font-normal">Item</th>
                  <th className="px-4 py-2 font-normal">Wears priced</th>
                  <th className="px-4 py-2 text-right font-normal">
                    {ev.caseKind === "weapon_case" ? "Normal avg" : "Avg price"}
                  </th>
                  {ev.caseKind === "weapon_case" && (
                    <th className="px-4 py-2 text-right font-normal">StatTrak avg</th>
                  )}
                  <th className="px-4 py-2 text-right font-normal">E[price]</th>
                  <th className="px-4 py-2 text-right font-normal">Contribution to EV</th>
                </tr>
              </thead>
              <tbody>
                {tier.items.map((item) => {
                  const contribution =
                    item.expectedPrice != null
                      ? tier.perItemProbability * item.expectedPrice
                      : null;
                  return (
                    <tr key={item.baseName} className="border-t border-bg-border/60 hover:bg-bg-elevated/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <div className="relative h-10 w-16 shrink-0 rounded bg-bg-elevated/60 ring-1 ring-bg-border">
                              <Image
                                src={item.imageUrl}
                                alt={item.baseName}
                                fill
                                sizes="64px"
                                className="object-contain p-1"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-16 shrink-0 rounded bg-bg-elevated/40" />
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <RarityBar rarity={item.rarity} />
                              <span className={item.unpriced ? "text-ink-faint" : "text-ink"}>
                                {item.baseName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-ink-dim">
                        {(() => {
                          const used = item.perWear.filter((w) => w.price != null && !w.droppedAsOutlier).length;
                          const dropped = item.perWear.filter((w) => w.droppedAsOutlier).length;
                          const total = item.perWear.length;
                          return (
                            <span title={dropped > 0 ? `${dropped} wear(s) dropped as thin-market outliers` : undefined}>
                              {used} / {total}
                              {dropped > 0 && (
                                <span className="ml-1 text-warn">−{dropped}</span>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <PriceCell value={item.normalPrice} />
                      </td>
                      {ev.caseKind === "weapon_case" && (
                        <td className="px-4 py-2 text-right">
                          <PriceCell value={item.statTrakPrice} />
                        </td>
                      )}
                      <td className="px-4 py-2 text-right">
                        <PriceCell value={item.expectedPrice} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <PriceCell value={contribution} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
