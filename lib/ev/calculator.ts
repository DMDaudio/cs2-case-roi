import type { AggregatedPrice } from "@/lib/prices/types";
import type { CaseMeta, CaseItem, Rarity, Wear } from "@/lib/metadata/types";
import {
  TIER_PROBABILITY_BY_KIND,
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
  perWear: Array<{
    wear: Wear | null;
    price: number | null;
    statTrakPrice: number | null;
    quantity: number | null;
    /** True when this wear was dropped from the average due to thin liquidity. */
    droppedAsOutlier?: boolean;
  }>;
  unpriced: boolean;
};

export type TierBreakdown = {
  rarity: Rarity;
  probability: number;
  itemCount: number;
  averageExpectedPrice: number | null;
  perItemProbability: number;
  items: SkinPricing[];
  unpricedCount: number;
};

export type CaseEV = {
  caseId: string;
  caseName: string;
  caseImageUrl: string | null;
  caseKind: CaseMeta["kind"];
  caseUnitPrice: number | null;
  keyUnitPrice: number | null;
  totalCostPerOpen: number | null;
  evGross: number | null;
  evNet: number | null;
  evPct: number | null;
  stdDev: number | null;
  lotteryScore: number | null;
  tiers: TierBreakdown[];
  totalItems: number;
  unpricedItems: number;
  generatedAt: number;
};

/** Build the market_hash_names needed to price one container. */
export function namesForCase(c: CaseMeta): string[] {
  const out = new Set<string>();
  out.add(c.caseMarketHashName);
  if (c.keyMarketHashName && c.requiresKey) out.add(c.keyMarketHashName);
  const all = [...c.contents, ...c.rareSpecial];
  for (const item of all) {
    if (item.availableWears.length === 0) {
      // wearless (capsules) — baseName is already the full market name
      out.add(item.baseName);
    } else {
      for (const w of item.availableWears) {
        out.add(`${item.baseName} (${w})`);
        if (item.statTrakAvailable) {
          out.add(`StatTrak™ ${item.baseName} (${w})`);
        }
      }
    }
  }
  return Array.from(out);
}

/**
 * Thin-market wears (qty < MIN_LIQUID_QTY listings on the deepest source)
 * are excluded from the wear-average when at least MIN_LIQUID_WEARS other
 * wears for the same skin are liquid. This protects against single
 * sticker-laden souvenir listings that would otherwise multiply EV by 100x.
 */
const MIN_LIQUID_QTY = 3;
const MIN_LIQUID_WEARS = 2;

function priceForItem(
  item: CaseItem,
  lookup: Map<string, AggregatedPrice>
): SkinPricing {
  const perWear: SkinPricing["perWear"] = [];

  if (item.availableWears.length === 0) {
    // Capsule item: single market name, no wear, no StatTrak.
    const agg = lookup.get(item.baseName);
    perWear.push({
      wear: null,
      price: agg?.bestPrice ?? null,
      statTrakPrice: null,
      quantity: agg?.quantity ?? null,
    });
  } else {
    for (const wear of item.availableWears) {
      const normalKey = `${item.baseName} (${wear})`;
      const stKey = `StatTrak™ ${item.baseName} (${wear})`;
      const normalAgg = lookup.get(normalKey);
      const st = item.statTrakAvailable ? lookup.get(stKey)?.bestPrice ?? null : null;
      perWear.push({
        wear,
        price: normalAgg?.bestPrice ?? null,
        statTrakPrice: st,
        quantity: normalAgg?.quantity ?? null,
      });
    }
  }

  // Outlier filter: if we have enough other liquid wears, drop the thin ones.
  // quantity == null means "source doesn't expose depth" — treat as unknown, don't filter.
  const liquidCount = perWear.filter(
    (w) => w.price != null && w.quantity != null && w.quantity >= MIN_LIQUID_QTY
  ).length;
  if (liquidCount >= MIN_LIQUID_WEARS) {
    for (const w of perWear) {
      if (w.price != null && w.quantity != null && w.quantity < MIN_LIQUID_QTY) {
        w.droppedAsOutlier = true;
      }
    }
  }

  const normalPrices = perWear
    .filter((w) => w.price != null && !w.droppedAsOutlier)
    .map((w) => w.price as number);
  const stPrices = perWear
    .filter((w) => w.statTrakPrice != null && !w.droppedAsOutlier)
    .map((w) => w.statTrakPrice as number);

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
  const keyMarketPrice = c.keyMarketHashName
    ? prices.get(c.keyMarketHashName)?.bestPrice ?? null
    : null;
  const keyUnitPrice = c.requiresKey ? keyMarketPrice ?? KEY_PRICE_USD : 0;
  const totalCostPerOpen =
    caseUnitPrice != null && keyUnitPrice != null ? caseUnitPrice + keyUnitPrice : null;

  const tierMap = TIER_PROBABILITY_BY_KIND[c.kind];
  const tiers: TierBreakdown[] = [];

  for (const [rarityKey, tierProb] of Object.entries(tierMap)) {
    const rarity = rarityKey as Rarity;
    if (tierProb == null) continue;
    const pool =
      rarity === "rare_special"
        ? c.rareSpecial
        : c.contents.filter((i) => i.rarity === rarity);
    if (pool.length === 0) continue;

    const items = pool.map((it) => priceForItem(it, lookup(prices)));
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

  const totalTierProb = tiers.reduce((a, t) => a + t.probability, 0);

  let evGross: number | null = null;
  let variance: number | null = null;
  const tiersWithAvg = tiers.filter((t) => t.averageExpectedPrice != null);

  if (tiers.length > 0 && tiersWithAvg.length === tiers.length) {
    evGross =
      tiersWithAvg.reduce(
        (a, t) => a + t.probability * (t.averageExpectedPrice as number),
        0
      ) / totalTierProb;

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
    caseKind: c.kind,
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

// Trivial helper: keeps priceForItem's signature stable while letting us
// pass the price map through without type gymnastics.
function lookup(p: Map<string, AggregatedPrice>) {
  return p;
}
