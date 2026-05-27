import type { PriceHistory } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(d: string): number {
  return Date.parse(d + "T00:00:00Z");
}

/** Points within `days` of the most recent point, oldest→newest. */
function windowed(h: PriceHistory, days: number): PriceHistory {
  if (h.length === 0) return [];
  const sorted = [...h].sort((a, b) => toTime(a.d) - toTime(b.d));
  const latest = toTime(sorted[sorted.length - 1].d);
  const cutoff = latest - days * DAY_MS;
  return sorted.filter((pt) => toTime(pt.d) >= cutoff);
}

/** % change (0.5 = +50%) from oldest to newest point inside the window. */
export function appreciation(h: PriceHistory, days: number): number | null {
  const w = windowed(h, days);
  if (w.length < 2) return null;
  const first = w[0].p;
  const last = w[w.length - 1].p;
  if (!first || first <= 0) return null;
  return (last - first) / first;
}

/** Standard deviation of day-over-day returns. */
export function volatility(h: PriceHistory): number | null {
  const sorted = [...h].sort((a, b) => toTime(a.d) - toTime(b.d));
  if (sorted.length < 2) return null;
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].p;
    if (prev > 0) returns.push((sorted[i].p - prev) / prev);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const varc =
    returns.reduce((a, b) => a + (b - mean) * (b - mean), 0) / returns.length;
  return Math.sqrt(varc);
}

/** Volume change over the window (last - first). */
export function volumeTrend(h: PriceHistory, days: number): number | null {
  const w = windowed(h, days);
  if (w.length < 2) return null;
  return w[w.length - 1].v - w[0].v;
}

/**
 * Heuristic: positive when price has risen while volume has fallen —
 * the classic "removed from drop pool, supply freezing" signature.
 */
export function frozenSupplyScore(h: PriceHistory): number {
  const appr = appreciation(h, 90) ?? appreciation(h, 365);
  const vol = volumeTrend(h, 90) ?? volumeTrend(h, 365);
  if (appr == null || vol == null) return 0;
  if (appr > 0 && vol < 0) return appr * Math.min(1, Math.abs(vol) / 50);
  return appr > 0 ? 0 : appr;
}
