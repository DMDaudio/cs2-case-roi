import { loadCases } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { getHistories } from "@/lib/history/store";
import { appreciation, volatility, frozenSupplyScore } from "@/lib/history/metrics";
import { verdictFor, type Verdict } from "./verdict";
import type { HistoryPoint } from "@/lib/history/types";
import type { CaseKind } from "@/lib/metadata/types";

export type InvestRow = {
  caseId: string;
  caseName: string;
  caseKind: CaseKind;
  caseImageUrl: string | null;
  currentPrice: number | null;
  change30d: number | null;
  change90d: number | null;
  change365d: number | null;
  volatility: number | null;
  frozenSupply: boolean;
  verdict: Verdict;
  spark: HistoryPoint[];
};

const FROZEN_THRESHOLD = 0.05;

export async function getInvestRows(): Promise<InvestRow[]> {
  const cases = loadCases();
  const containerNames = cases.map((c) => c.caseMarketHashName);

  // Only the container's own price is needed here (Skinport-fast).
  const agg = await aggregate(containerNames, { sources: ["skinport"] });
  const histories = await getHistories(containerNames);

  return cases.map((c) => {
    const hist = histories.get(c.caseMarketHashName) ?? [];
    const currentPrice = agg.prices.get(c.caseMarketHashName)?.bestPrice ?? null;
    const change90d = appreciation(hist, 90);
    return {
      caseId: c.id,
      caseName: c.name,
      caseKind: c.kind,
      caseImageUrl: c.imageUrl,
      currentPrice,
      change30d: appreciation(hist, 30),
      change90d,
      change365d: appreciation(hist, 365),
      volatility: volatility(hist),
      frozenSupply: frozenSupplyScore(hist) > FROZEN_THRESHOLD,
      verdict: verdictFor({ evPct: null, appreciation90d: change90d, lotteryScore: null }),
      spark: hist.slice(-90),
    };
  });
}
