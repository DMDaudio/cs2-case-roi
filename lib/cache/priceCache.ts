import {
  getRow,
  setRow,
  getRows,
  deleteByName,
  setSourceDown,
  getSourceDown,
  maxFetchedAt,
} from "./db";
import type { PriceQuote, SourceName } from "@/lib/prices/types";

export const PRICE_TTL_MS = 30 * 60 * 1000;
export const SOURCE_DOWN_MS = 10 * 60 * 1000;

export async function getCachedQuote(
  marketHashName: string,
  source: SourceName,
  now = Date.now()
): Promise<PriceQuote | null> {
  const r = await getRow(source, marketHashName);
  if (!r) return null;
  if (now - r.fetchedAt > PRICE_TTL_MS) return null;
  return {
    marketHashName,
    source,
    lowestPrice: r.lowestPrice,
    medianPrice: r.medianPrice,
    quantity: r.quantity ?? null,
    fetchedAt: r.fetchedAt,
  };
}

export async function getAllCached(
  marketHashNames: string[],
  source: SourceName
): Promise<Map<string, PriceQuote>> {
  const rows = await getRows(source, marketHashNames);
  const out = new Map<string, PriceQuote>();
  for (const [name, r] of rows) {
    out.set(name, {
      marketHashName: name,
      source,
      lowestPrice: r.lowestPrice,
      medianPrice: r.medianPrice,
      quantity: r.quantity ?? null,
      fetchedAt: r.fetchedAt,
    });
  }
  return out;
}

export async function setCachedQuotes(quotes: PriceQuote[]): Promise<void> {
  for (const q of quotes) {
    await setRow(q.source, q.marketHashName, {
      lowestPrice: q.lowestPrice,
      medianPrice: q.medianPrice,
      quantity: q.quantity,
      fetchedAt: q.fetchedAt,
    });
  }
}

export async function invalidate(marketHashNames: string[]): Promise<void> {
  await deleteByName(marketHashNames);
}

export async function markSourceDown(source: SourceName, now = Date.now()): Promise<void> {
  await setSourceDown(source, now + SOURCE_DOWN_MS);
}

export async function isSourceDown(source: SourceName, now = Date.now()): Promise<boolean> {
  const until = await getSourceDown(source);
  if (until == null) return false;
  return until > now;
}

export async function lastRefreshAt(): Promise<number | null> {
  return maxFetchedAt();
}
