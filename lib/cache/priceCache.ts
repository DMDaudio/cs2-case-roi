import {
  getRow,
  setRow,
  deleteByName,
  setSourceDown,
  getSourceDown,
  maxFetchedAt,
  getAllRows,
} from "./db";
import type { PriceQuote, SourceName } from "@/lib/prices/types";

export const PRICE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const SOURCE_DOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Returns the cached quote for (mhn, source) if it's still fresh, else null. */
export function getCachedQuote(
  marketHashName: string,
  source: SourceName,
  now = Date.now()
): PriceQuote | null {
  const r = getRow(source, marketHashName);
  if (!r) return null;
  if (now - r.fetchedAt > PRICE_TTL_MS) return null;
  return {
    marketHashName,
    source,
    lowestPrice: r.lowestPrice,
    medianPrice: r.medianPrice,
    fetchedAt: r.fetchedAt,
  };
}

/** Returns all cached quotes for the given names regardless of TTL. */
export function getAllCached(
  marketHashNames: string[],
  source: SourceName
): Map<string, PriceQuote> {
  if (marketHashNames.length === 0) return new Map();
  const rows = getAllRows(source);
  const out = new Map<string, PriceQuote>();
  for (const name of marketHashNames) {
    const r = rows.get(name);
    if (!r) continue;
    out.set(name, {
      marketHashName: name,
      source,
      lowestPrice: r.lowestPrice,
      medianPrice: r.medianPrice,
      fetchedAt: r.fetchedAt,
    });
  }
  return out;
}

export function setCachedQuotes(quotes: PriceQuote[]) {
  for (const q of quotes) {
    setRow(q.source, q.marketHashName, {
      lowestPrice: q.lowestPrice,
      medianPrice: q.medianPrice,
      fetchedAt: q.fetchedAt,
    });
  }
}

/** Drop cached prices for the given market_hash_names across all sources. */
export function invalidate(marketHashNames: string[]) {
  deleteByName(marketHashNames);
}

export function markSourceDown(source: SourceName, now = Date.now()) {
  setSourceDown(source, now + SOURCE_DOWN_MS);
}

export function isSourceDown(source: SourceName, now = Date.now()): boolean {
  const until = getSourceDown(source);
  if (until == null) return false;
  return until > now;
}

/** Returns the unix-ms timestamp of the most recent cached row, or null. */
export function lastRefreshAt(): number | null {
  return maxFetchedAt();
}
