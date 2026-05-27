export type Verdict = "SELL" | "HOLD" | "RISKY_OPEN";

export type VerdictInput = {
  evPct: number | null;
  appreciation90d: number | null;
  lotteryScore: number | null;
};

const HOLD_APPRECIATION = 0.1; // +10% over 90d
const RISKY_LOTTERY = 4; // σ/μ
const RISKY_EV = -0.6;

/**
 * Plain-language guidance for what to do with a container.
 *  HOLD       — appreciating fast enough to beat the open-EV loss.
 *  RISKY_OPEN — deep negative EV but knife-driven upside (high σ/μ).
 *  SELL       — everything else (default / unknown).
 */
export function verdictFor(input: VerdictInput): Verdict {
  const { evPct, appreciation90d, lotteryScore } = input;

  if (appreciation90d != null && appreciation90d >= HOLD_APPRECIATION) {
    return "HOLD";
  }
  if (
    evPct != null &&
    evPct <= RISKY_EV &&
    lotteryScore != null &&
    lotteryScore >= RISKY_LOTTERY
  ) {
    return "RISKY_OPEN";
  }
  return "SELL";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  SELL: "Sell",
  HOLD: "Hold",
  RISKY_OPEN: "Risky open",
};
