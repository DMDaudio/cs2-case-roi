import { describe, expect, it } from "vitest";
import {
  appreciation,
  volatility,
  volumeTrend,
  frozenSupplyScore,
} from "@/lib/history/metrics";
import type { PriceHistory } from "@/lib/history/types";

function series(points: Array<[string, number, number]>): PriceHistory {
  return points.map(([d, p, v]) => ({ d, p, v }));
}

describe("appreciation", () => {
  it("returns null when not enough history covers the window", () => {
    const h = series([["2026-05-25", 10, 5]]);
    expect(appreciation(h, 30)).toBeNull();
  });

  it("computes percent change from the oldest point within the window to the newest", () => {
    const h = series([
      ["2026-04-26", 100, 5],
      ["2026-05-26", 150, 5],
    ]);
    expect(appreciation(h, 30)).toBeCloseTo(0.5, 6);
  });

  it("uses only points inside the window", () => {
    const h = series([
      ["2025-01-01", 1, 5],
      ["2026-05-10", 200, 5],
      ["2026-05-26", 100, 5],
    ]);
    expect(appreciation(h, 30)).toBeCloseTo(-0.5, 6);
  });
});

describe("volatility", () => {
  it("is 0 for a flat series", () => {
    const h = series([
      ["2026-05-24", 10, 1],
      ["2026-05-25", 10, 1],
      ["2026-05-26", 10, 1],
    ]);
    expect(volatility(h)).toBeCloseTo(0, 6);
  });

  it("is positive for a varying series", () => {
    const h = series([
      ["2026-05-24", 10, 1],
      ["2026-05-25", 20, 1],
      ["2026-05-26", 10, 1],
    ]);
    expect(volatility(h)!).toBeGreaterThan(0);
  });
});

describe("frozenSupplyScore", () => {
  it("is high when price rises while volume falls", () => {
    const h = series([
      ["2026-03-26", 5, 100],
      ["2026-04-26", 8, 60],
      ["2026-05-26", 12, 20],
    ]);
    expect(frozenSupplyScore(h)).toBeGreaterThan(0);
  });

  it("is <= 0 when price falls", () => {
    const h = series([
      ["2026-03-26", 12, 20],
      ["2026-04-26", 8, 60],
      ["2026-05-26", 5, 100],
    ]);
    expect(frozenSupplyScore(h)).toBeLessThanOrEqual(0);
  });
});

describe("volumeTrend", () => {
  it("is negative when volume declines over the window", () => {
    const h = series([
      ["2026-04-26", 5, 100],
      ["2026-05-26", 5, 20],
    ]);
    expect(volumeTrend(h, 90)!).toBeLessThan(0);
  });
});
