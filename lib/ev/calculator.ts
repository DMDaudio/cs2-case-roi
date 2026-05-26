import type { AggregatedPrice } from "@/lib/prices/types";
import type { CaseMeta, CaseItem, Rarity, Wear } from "@/lib/metadata/types";
import { RARITY_ORDER } from "@/lib/metadata/types";
import {
  TIER_PROBABILITY,
  STAT_TRAK_PROBABILITY,
  STAT_TRAK_FALLBACK_MULTIPLIER,
  KEY_PRICE_USD,
} from "./odds";

export type SkinPricing = {
  baseName: string;
  rarity: Rarity;
  imageUrl: string | null;
  /** Mean of available-wear prices. null = no source priced any wear. */
  normalPrice: number | null;
  /** Same logic for StatTrak™ variants. */
  statTrakPrice: number | null;
  /** Blended: 0.9 * normal + 0.1 * stattrak. */
  expectedPrice: number | null;
  perWear: Array<{ wear: Wear; price: number | null; statTrakPrice: number | null }>;
  unpriced: boolean;
};

export type TierBreakdown = {
  rarity: Rarity;
  probability: number;
  itemCount: number;
  averageExpectedPrice: number | null;
  /** Probability of any one skin within the tier ≈ probability / itemCount. */
  perItemProbability: number;
  items: SkinPricing[];
  /** Number of items with no priced wear at all. */
  unpricedCount: number;
};

export type CaseEV = {
  caseId: string;
  caseName: string;
  caseImageUrl: string | null;
  /** Cost to open one case (case + key). */
  caseUnitPrice: number | null;
  keyUnitPrice: number | null;
  totalCostPerOpen: number | null;
  /** Expected $ value of the unboxed item. */
  evGross: number | null;
  /** evGross − totalCostPerOpen. */
  evNet: number | null;
  /** evNet / totalCostPerOpen. */
  evPct: number | null;
  /** sqrt of total variance of unboxed-item value. */
  stdDev: number | null;
  /** stdDev / evGross — higher = more "lottery-like". */
  lotteryScore: number | null;
  tiers: TierBreakdown[];
  totalItems: number;
  unpricedItems: number;
  generatedAt: number;
};

/**
 * Build the market_hash_names needed to price one case. Includes:
 *  - case container
 *  - key
 *  - every (skin × wear) and its StatTrak variant when applicable
 */
export function namesForCase(c: CaseMeta): string[] {
  const out = new Set<string>();
  out.add(c.caseMarketHashName);
  if (c.keyMarketHashName) out.add(c.keyMarketHashName);
  const all = [...c.contents, ...c.rareSpecial];
  for (const item of all) {
    for (const w of item.availableWears) {
      const normal = `${item.baseName} (${w})`;
      out.add(normal);
      if (item.statTrakAvailable) {
        out.add(`StatTrak™ ${item.baseName} (${w})`);
      }
    }
  }
  return Array.from(out);
}

function priceForItem(
  item: CaseItem,
  lookup: Map<string, AggregatedPrice>
): SkinPricing {
  const perWear: SkinPricing["perWear"] = [];
  const normalPrices: number[] = [];
  const stPrices: number[] = [];

  for (const wear of item.availableWears) {
    const normalKey = `${item.baseName} (${wear})`;
    const stKey = `StatTrak™ ${item.baseName} (${wear})`;
    const normal = lookup.get(normalKey)?.bestPrice ?? null;
    const st = item.statTrakAvailable ? lookup.get(stKey)?.bestPrice ?? null : null;
    perWear.push({ wear, price: normal, statTrakPrice: st });
    if (normal != null) normalPrices.push(normal);
    if (st != null) stPrices.push(st);
  }

  const normalPrice =
    normalPrices.length > 0
      ? normalPrices.reduce((a, b) => a + b, 0) / normalPrices.length
      : null;

  let statTrakPrice: number | null;
  if (stPrices.length > 0) {
    statTrakPrice = stPrices.reduce((a, b) => a + b, 0) / stPrices.length;
  } else if (item.statTrakAvailable && normalPrice != null) {
    statTrakPrice = normalPrice * STAT_TRAK_FALLBACK_MULTIPLIER;
  } else {
    statTrakPrice = null;
  }

  let expectedPrice: number | null;
  if (item.statTrakAvailable && normalPrice != null && statTrakPrice != null) {
    expectedPrice =
      (1 - STAT_TRAK_PROBABILITY) * normalPrice +
      STAT_TRAK_PROBABILITY * statTrakPrice;
  } else if (normalPrice != null) {
    expectedPrice = normalPrice;
  } else {
    expectedPrice = null;
  }

  return {
    baseName: item.baseName,
    rarity: item.rarity,
    imageUrl: item.imageUrl,
    normalPrice,
    statTrakPrice,
    expectedPrice,
    perWear,
    unpriced: expectedPrice == null,
  };
}

export function computeCaseEV(
  c: CaseMeta,
  prices: Map<string, AggregatedPrice>,
  now = Date.now()
): CaseEV {
  const caseUnitPrice = prices.get(c.caseMarketHashName)?.bestPrice ?? null;
  // Case keys haven't been marketable since Oct 2019 — they're sold
  // only by Valve at a fixed $2.50. Use the live market price only if
  // somehow listed (legacy pre-2019 keys), otherwise fall back to the
  // constant.
  const keyMarketPrice = c.keyMarketHashName
    ? prices.get(c.keyMarketHashName)?.bestPrice ?? null
    : null;
  const keyUnitPrice = c.requiresKey
    ? keyMarketPrice ?? KEY_PRICE_USD
    : 0;
  const totalCostPerOpen =
    caseUnitPrice != null && keyUnitPrice != null ? caseUnitPrice + keyUnitPrice : null;

  const tiers: TierBreakdown[] = [];

  for (const rarity of RARITY_ORDER) {
    const pool =
      rarity === "rare_special"
        ? c.rareSpecial
        : c.contents.filter((i) => i.rarity === rarity);
    if (pool.length === 0) continue;

    const tierProb = TIER_PROBABILITY[rarity];
    const items = pool.map((it) => priceForItem(it, prices));
    const priced = items.filter((x) => x.expectedPrice != null);
    const avg =
      priced.length > 0
        ? priced.reduce((a, b) => a + (b.expectedPrice as number), 0) / priced.length
        : null;

    tiers.push({
      rarity,
      probability: tierProb,
      itemCount: items.length,
      averageExpectedPrice: avg,
      perItemProbability: tierProb / items.length,
      items,
      unpricedCount: items.length - priced.length,
    });
  }

  // Total drop probability of the tiers we actually have.
  // Almost all cases include all 5 tiers; some lack rare_special.
  const totalTierProb = tiers.reduce((a, t) => a + t.probability, 0);

  let evGross: number | null = null;
  let variance: number | null = null;
  const tiersWithAvg = tiers.filter((t) => t.averageExpectedPrice != null);

  if (tiersWithAvg.length === tiers.length && tiersWithAvg.length > 0) {
    // EV = Σ p_t * mean_t, scaled by the renormaliser if a tier is missing
    evGross =
      tiersWithAvg.reduce(
        (a, t) => a + t.probability * (t.averageExpectedPrice as number),
        0
      ) / totalTierProb;

    // Variance: assume within-tier uniform-over-items distribution.
    // Var(X) = E[X^2] − (E[X])^2
    //       = Σ p_t * (1/n_t) Σ price_i^2 / norm − evGross^2
    let exSquared = 0;
    for (const t of tiers) {
      const priced = t.items.filter((x) => x.expectedPrice != null);
      if (priced.length === 0) continue;
      const meanSq =
        priced.reduce(
          (a, b) => a + (b.expectedPrice as number) * (b.expectedPrice as number),
          0
        ) / priced.length;
      exSquared += t.probability * meanSq;
    }
    exSquared /= totalTierProb;
    variance = Math.max(0, exSquared - evGross * evGross);
  }

  const evNet = evGross != null && totalCostPerOpen != null ? evGross - totalCostPerOpen : null;
  const evPct =
    evNet != null && totalCostPerOpen && totalCostPerOpen > 0 ? evNet / totalCostPerOpen : null;
  const stdDev = variance != null ? Math.sqrt(variance) : null;
  const lotteryScore = stdDev != null && evGross && evGross > 0 ? stdDev / evGross : null;

  const totalItems = tiers.reduce((a, t) => a + t.itemCount, 0);
  const unpricedItems = tiers.reduce((a, t) => a + t.unpricedCount, 0);

  return {
    caseId: c.id,
    caseName: c.name,
    caseImageUrl: c.imageUrl,
    caseUnitPrice,
    keyUnitPrice,
    totalCostPerOpen,
    evGross,
    evNet,
    evPct,
    stdDev,
    lotteryScore,
    tiers,
    totalItems,
    unpricedItems,
    generatedAt: now,
  };
}
