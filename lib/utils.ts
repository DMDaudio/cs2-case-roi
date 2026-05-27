import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(n: number | null | undefined, opts?: { dimSymbol?: boolean }): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const fixed = n >= 1000 ? n.toFixed(0) : n.toFixed(2);
  const formatted = Number(fixed).toLocaleString("en-US", {
    minimumFractionDigits: n >= 1000 ? 0 : 2,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });
  return `$${formatted}`;
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = n * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/** Format a ratio as a plain percentage with no leading sign (e.g. 0.474 → "47%"). */
export function formatRatioPct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

/**
 * Unboxing ROI = the share of your spend you get back on average.
 * Derived from net EV%: grossROI = 1 + evPct. (evPct = EV/cost − 1)
 */
export function unboxingRoi(evPct: number | null | undefined): number | null {
  if (evPct == null || !Number.isFinite(evPct)) return null;
  return evPct + 1;
}

export function relativeTime(unixMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - unixMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
