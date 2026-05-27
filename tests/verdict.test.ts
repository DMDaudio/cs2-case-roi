import { describe, expect, it } from "vitest";
import { verdictFor } from "@/lib/invest/verdict";

describe("verdictFor", () => {
  it("HOLD when appreciation is strongly positive", () => {
    expect(verdictFor({ evPct: -0.6, appreciation90d: 0.25, lotteryScore: 1 })).toBe("HOLD");
  });

  it("RISKY_OPEN when EV is deeply negative and lottery score is high", () => {
    expect(verdictFor({ evPct: -0.7, appreciation90d: 0.0, lotteryScore: 6 })).toBe("RISKY_OPEN");
  });

  it("SELL when price is flat/declining and open-EV is negative", () => {
    expect(verdictFor({ evPct: -0.65, appreciation90d: -0.05, lotteryScore: 1.5 })).toBe("SELL");
  });

  it("defaults to SELL when data is missing", () => {
    expect(verdictFor({ evPct: null, appreciation90d: null, lotteryScore: null })).toBe("SELL");
  });
});
