/**
 * One-off (resumable) backfill of Steam price history into Vercel KV.
 *
 * Requires env:
 *   STEAM_LOGIN_SECURE   — your steamLoginSecure cookie value
 *   KV_REST_API_URL      — set automatically when linked to Vercel KV
 *   KV_REST_API_TOKEN
 *
 * Run:  STEAM_LOGIN_SECURE=... npx tsx scripts/backfill-history.ts
 */
import { loadCases } from "../lib/metadata/loadCases";
import { setHistory } from "../lib/history/store";
import type { HistoryPoint } from "../lib/history/types";

const COOKIE = process.env.STEAM_LOGIN_SECURE;
const GAP_MS = 1500;
const MAX_DAYS = 365;

type RawHist = { success: boolean; prices?: [string, number, string][] };

function downsampleDaily(prices: [string, number, string][]): HistoryPoint[] {
  const byDay = new Map<string, { p: number; v: number }>();
  for (const [dateStr, median, volStr] of prices) {
    // "May 26 2026 01: +0" → "2026-05-26"
    const d = new Date(dateStr.replace(/ \d+: \+0$/, ""));
    if (isNaN(d.getTime())) continue;
    const iso = d.toISOString().slice(0, 10);
    byDay.set(iso, { p: median, v: Number(volStr) || 0 });
  }
  return [...byDay.entries()]
    .map(([d, { p, v }]) => ({ d, p, v }))
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-MAX_DAYS);
}

async function fetchHistory(name: string): Promise<HistoryPoint[] | null> {
  const url =
    `https://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=` +
    encodeURIComponent(name);
  const res = await fetch(url, {
    headers: { cookie: `steamLoginSecure=${COOKIE}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawHist;
  if (!json.success || !json.prices) return null;
  return downsampleDaily(json.prices);
}

async function main() {
  if (!COOKIE) {
    console.error("Set STEAM_LOGIN_SECURE env var.");
    process.exit(1);
  }
  if (!process.env.KV_REST_API_URL) {
    console.error("KV not configured — link the project to Vercel KV and pull env vars.");
    process.exit(1);
  }
  const names = loadCases().map((c) => c.caseMarketHashName);
  let done = 0;
  for (const name of names) {
    try {
      const hist = await fetchHistory(name);
      if (hist && hist.length > 0) {
        await setHistory(name, hist);
        done++;
        console.log(`[${done}/${names.length}] ${name} (${hist.length} pts)`);
      } else {
        console.warn(`  no history / auth failed for "${name}" — cookie may be expired`);
      }
    } catch (err) {
      console.error(`  error on "${name}":`, err);
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  console.log(`Backfill complete: ${done}/${names.length} containers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
