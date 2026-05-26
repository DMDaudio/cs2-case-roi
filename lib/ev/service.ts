import { loadCases, loadCaseById } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { computeCaseEV, namesForCase, type CaseEV } from "./calculator";
import { lastRefreshAt } from "@/lib/cache/priceCache";
import type { SourceName } from "@/lib/prices/types";

export type CaseSummary = Pick<
  CaseEV,
  | "caseId"
  | "caseName"
  | "caseImageUrl"
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
>;

function toSummary(ev: CaseEV): CaseSummary {
  const {
    caseId,
    caseName,
    caseImageUrl,
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

  const agg = await aggregate(Array.from(everyName), { bypassCache: opts?.bypassCache });

  const summaries: CaseSummary[] = [];
  for (const c of cases) {
    const ev = computeCaseEV(c, agg.prices);
    summaries.push(toSummary(ev));
  }

  return {
    cases: summaries,
    sourceStatus: agg.sourceStatus,
    lastRefreshAt: lastRefreshAt(),
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
      lastRefreshAt: lastRefreshAt(),
    };
  }
  const agg = await aggregate(namesForCase(c), { bypassCache: opts?.bypassCache });
  return {
    case: computeCaseEV(c, agg.prices),
    sourceStatus: agg.sourceStatus,
    lastRefreshAt: lastRefreshAt(),
  };
}
