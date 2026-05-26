import { describe, expect, it } from "vitest";
import { computeCaseEV, namesForCase } from "@/lib/ev/calculator";
import type { CaseMeta } from "@/lib/metadata/types";
import type { AggregatedPrice } from "@/lib/prices/types";
import {
  TIER_PROBABILITY,
  STAT_TRAK_PROBABILITY,
  STAT_TRAK_FALLBACK_MULTIPLIER,
} from "@/lib/ev/odds";

function priceMap(entries: Record<string, number | null>): Map<string, AggregatedPrice> {
  const m = new Map<string, AggregatedPrice>();
  for (const [k, v] of Object.entries(entries)) {
    m.set(k, {
      marketHashName: k,
      bestPrice: v,
      meanAcrossSources: v,
      sources: [],
      fetchedAt: 0,
    });
  }
  return m;
}

// Synthetic case: 1 skin per tier, single wear "Factory New", no StatTrak.
const SYNTHETIC: CaseMeta = {
  id: "synthetic",
  name: "Synthetic Case",
  imageUrl: null,
  releaseDate: null,
  requiresKey: true,
  keyMarketHashName: "Synthetic Case Key",
  caseMarketHashName: "Synthetic Case",
  contents: [
    { baseName: "Mil", rarity: "mil_spec", availableWears: ["Factory New"], statTrakAvailable: false, imageUrl: null },
    { baseName: "Res", rarity: "restricted", availableWears: ["Factory New"], statTrakAvailable: false, imageUrl: null },
    { baseName: "Cla", rarity: "classified", availableWears: ["Factory New"], statTrakAvailable: false, imageUrl: null },
    { baseName: "Cov", rarity: "covert", availableWears: ["Factory New"], statTrakAvailable: false, imageUrl: null },
  ],
  rareSpecial: [
    { baseName: "Knife", rarity: "rare_special", availableWears: ["Factory New"], statTrakAvailable: false, imageUrl: null },
  ],
};

describe("namesForCase", () => {
  it("includes case, key, all (skin × wear) and StatTrak variants where applicable", () => {
    const names = namesForCase(SYNTHETIC);
    expect(names).toContain("Synthetic Case");
    expect(names).toContain("Synthetic Case Key");
    expect(names).toContain("Mil (Factory New)");
    expect(names).toContain("Knife (Factory New)");
    expect(names).not.toContain("StatTrak™ Mil (Factory New)"); // statTrakAvailable=false
  });

  it("emits StatTrak variants when allowed", () => {
    const c: CaseMeta = {
      ...SYNTHETIC,
      contents: [
        { baseName: "X", rarity: "mil_spec", availableWears: ["Factory New", "Minimal Wear"], statTrakAvailable: true, imageUrl: null },
      ],
      rareSpecial: [],
    };
    const names = namesForCase(c);
    expect(names).toContain("StatTrak™ X (Factory New)");
    expect(names).toContain("StatTrak™ X (Minimal Wear)");
  });
});

describe("computeCaseEV — synthetic", () => {
  it("matches hand-computed EV with no StatTrak", () => {
    const prices = priceMap({
      "Synthetic Case": 1,
      "Synthetic Case Key": 2.5,
      "Mil (Factory New)": 1,
      "Res (Factory New)": 10,
      "Cla (Factory New)": 50,
      "Cov (Factory New)": 200,
      "Knife (Factory New)": 1000,
    });

    const ev = computeCaseEV(SYNTHETIC, prices);

    expect(ev.caseUnitPrice).toBe(1);
    expect(ev.keyUnitPrice).toBe(2.5);
    expect(ev.totalCostPerOpen).toBe(3.5);

    const expectedGross =
      TIER_PROBABILITY.mil_spec * 1 +
      TIER_PROBABILITY.restricted * 10 +
      TIER_PROBABILITY.classified * 50 +
      TIER_PROBABILITY.covert * 200 +
      TIER_PROBABILITY.rare_special * 1000;
    // tier probs already sum to 1; no renormalisation needed
    expect(ev.evGross).toBeCloseTo(expectedGross, 6);
    expect(ev.evNet).toBeCloseTo(expectedGross - 3.5, 6);
    expect(ev.evPct).toBeCloseTo((expectedGross - 3.5) / 3.5, 6);
  });

  it("applies the 0.9/0.1 StatTrak blend with fallback multiplier", () => {
    const c: CaseMeta = {
      ...SYNTHETIC,
      contents: [
        { baseName: "Mil", rarity: "mil_spec", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
        { baseName: "Res", rarity: "restricted", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
        { baseName: "Cla", rarity: "classified", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
        { baseName: "Cov", rarity: "covert", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
      ],
      rareSpecial: [
        { baseName: "Knife", rarity: "rare_special", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
      ],
    };

    // No explicit ST listings → fallback multiplier
    const prices = priceMap({
      "Synthetic Case": 0,
      "Synthetic Case Key": 0,
      "Mil (Factory New)": 1,
      "Res (Factory New)": 10,
      "Cla (Factory New)": 50,
      "Cov (Factory New)": 200,
      "Knife (Factory New)": 1000,
    });

    const ev = computeCaseEV(c, prices);

    const blend = (n: number) =>
      (1 - STAT_TRAK_PROBABILITY) * n + STAT_TRAK_PROBABILITY * n * STAT_TRAK_FALLBACK_MULTIPLIER;

    const expectedGross =
      TIER_PROBABILITY.mil_spec * blend(1) +
      TIER_PROBABILITY.restricted * blend(10) +
      TIER_PROBABILITY.classified * blend(50) +
      TIER_PROBABILITY.covert * blend(200) +
      TIER_PROBABILITY.rare_special * blend(1000);

    expect(ev.evGross).toBeCloseTo(expectedGross, 6);
  });

  it("uses explicit StatTrak listing when present", () => {
    const c: CaseMeta = {
      ...SYNTHETIC,
      contents: [
        { baseName: "Mil", rarity: "mil_spec", availableWears: ["Factory New"], statTrakAvailable: true, imageUrl: null },
      ],
      rareSpecial: [],
    };
    const prices = priceMap({
      "Synthetic Case": 0,
      "Synthetic Case Key": 0,
      "Mil (Factory New)": 10,
      "StatTrak™ Mil (Factory New)": 25, // bigger than 1.4x
    });
    const ev = computeCaseEV(c, prices);
    // Only Mil-Spec tier exists; EV = blend / (mil_spec prob)
    const blended = 0.9 * 10 + 0.1 * 25;
    expect(ev.evGross).toBeCloseTo(blended, 6);
  });

  it("averages across available wears", () => {
    const c: CaseMeta = {
      ...SYNTHETIC,
      contents: [
        { baseName: "Mil", rarity: "mil_spec", availableWears: ["Factory New", "Field-Tested"], statTrakAvailable: false, imageUrl: null },
      ],
      rareSpecial: [],
    };
    const prices = priceMap({
      "Synthetic Case": 0,
      "Synthetic Case Key": 0,
      "Mil (Factory New)": 8,
      "Mil (Field-Tested)": 4,
    });
    const ev = computeCaseEV(c, prices);
    expect(ev.evGross).toBeCloseTo(6, 6);
  });

  it("flags unpriced items and returns null EV when a whole tier is unpriced", () => {
    const prices = priceMap({
      "Synthetic Case": 1,
      "Synthetic Case Key": 1,
      "Mil (Factory New)": 1,
      "Res (Factory New)": null,
      "Cla (Factory New)": 50,
      "Cov (Factory New)": 200,
      "Knife (Factory New)": 1000,
    });
    const ev = computeCaseEV(SYNTHETIC, prices);
    expect(ev.unpricedItems).toBe(1);
    // 'Res' tier had only that one item → tier avg is null → overall EV null
    expect(ev.evGross).toBeNull();
  });

  it("variance is non-negative and scales with item spread", () => {
    const tight = priceMap({
      "Synthetic Case": 0,
      "Synthetic Case Key": 0,
      "Mil (Factory New)": 1,
      "Res (Factory New)": 1,
      "Cla (Factory New)": 1,
      "Cov (Factory New)": 1,
      "Knife (Factory New)": 1,
    });
    const spread = priceMap({
      "Synthetic Case": 0,
      "Synthetic Case Key": 0,
      "Mil (Factory New)": 1,
      "Res (Factory New)": 10,
      "Cla (Factory New)": 50,
      "Cov (Factory New)": 200,
      "Knife (Factory New)": 1000,
    });
    const a = computeCaseEV(SYNTHETIC, tight);
    const b = computeCaseEV(SYNTHETIC, spread);
    expect(a.stdDev).toBeCloseTo(0, 6);
    expect(b.stdDev).toBeGreaterThan(0);
  });
});
