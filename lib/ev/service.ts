import { loadCases, loadCaseById } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { computeCaseEV, namesForCase, type CaseEV } from "./calculator";
import { lastRefreshAt } from "@/lib/cache/priceCache";
import { getHistories } from "@/lib/history/store";
import { appreciation } from "@/lib/history/metrics";
import { verdictFor, type Verdict } from "@/lib/invest/verdict";
import type { HistoryPoint } from "@/lib/history/types";
import type { SourceName } from "@/lib/prices/types";

export type CaseSummary = Pick<
  CaseEV,
  | "caseId"
  | "caseName"
  | "caseImageUrl"
  | "caseKind"
  | "caseUnitPrice"
  | "keyUnitPrice"
  | "totalCostPerOpen"
  | "evGross"
  | "evNet"
  | "evPct"
  | "stdDev"
  | "lotteryScore"
  | "totalItems"
  | "unpricedItems"
  | "generatedAt"
> & {
  spark: HistoryPoint[];
  verdict: Verdict;
};

function toSummary(ev: CaseEV): CaseSummary {
  const {
    caseId,
    caseName,
    caseImageUrl,
    caseKind,
    caseUnitPrice,
    keyUnitPrice,
    totalCostPerOpen,
    evGross,
    evNet,
    evPct,
    stdDev,
    lotteryScore,
    totalItems,
    unpricedItems,
    generatedAt,
  } = ev;
  return {
    caseId,
    caseName,
    caseImageUrl,
    caseKind,
    caseUnitPrice,
    keyUnitPrice,
    totalCostPerOpen,
    evGross,
    evNet,
    evPct,
    stdDev,
    lotteryScore,
    totalItems,
    unpricedItems,
    generatedAt,
    // Trend fields default empty; getAllCaseSummaries fills them in.
    spark: [],
    verdict: "SELL",
  };
}

export type AllCasesResponse = {
  cases: CaseSummary[];
  sourceStatus: Record<SourceName, "ok" | "down" | "skipped">;
  lastRefreshAt: number | null;
};

export async function getAllCaseSummaries(opts?: {
  bypassCache?: boolean;
}): Promise<AllCasesResponse> {
  const cases = loadCases();
  // collect every market_hash_name across every case
  const everyName = new Set<string>();
  for (const c of cases) for (const n of namesForCase(c)) everyName.add(n);

  // The dashboard prices ~13k unique market names across 425 containers.
  // Skinport returns its whole catalogue in a single HTTP call (~2s), so
  // it's the only source fast enough for the grid. Detail pages still
  // query all three (~one case = a few hundred names = manageable).
  const agg = await aggregate(Array.from(everyName), {
    bypassCache: opts?.bypassCache,
    skipCache: true,
    sources: ["skinport"],
  });

  const summaries: CaseSummary[] = [];
  for (const c of cases) {
    const ev = computeCaseEV(c, agg.prices);
    summaries.push(toSummary(ev));
  }

  // Attach 90-day trend + verdict from price history.
  const histories = await getHistories(cases.map((c) => c.caseMarketHashName));
  const withTrend = summaries.map((s, i) => {
    const hist = histories.get(cases[i].caseMarketHashName) ?? [];
    const appr90 = appreciation(hist, 90);
    return {
      ...s,
      spark: hist.slice(-90),
      verdict: verdictFor({
        evPct: s.evPct,
        appreciation90d: appr90,
        lotteryScore: s.lotteryScore,
      }),
    };
  });

  return {
    cases: withTrend,
    sourceStatus: agg.sourceStatus,
    lastRefreshAt: await lastRefreshAt(),
  };
}

export type OneCaseResponse = {
  case: CaseEV | null;
  sourceStatus: Record<SourceName, "ok" | "down" | "skipped">;
  lastRefreshAt: number | null;
};

export async function getCaseDetail(
  id: string,
  opts?: { bypassCache?: boolean }
): Promise<OneCaseResponse> {
  const c = loadCaseById(id);
  if (!c) {
    return {
      case: null,
      sourceStatus: { steam: "skipped", csfloat: "skipped", skinport: "skipped" },
      lastRefreshAt: await lastRefreshAt(),
    };
  }
  const agg = await aggregate(namesForCase(c), { bypassCache: opts?.bypassCache });
  return {
    case: computeCaseEV(c, agg.prices),
    sourceStatus: agg.sourceStatus,
    lastRefreshAt: await lastRefreshAt(),
  };
}
