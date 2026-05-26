import type { PriceQuote, PriceSource } from "./types";

/**
 * CSFloat exposes a public listings endpoint. We query per-skin and
 * keep the lowest live ask. To avoid hammering, we serialise with a
 * small concurrency + delay similar to Steam.
 *
 * Endpoint shape (best-effort — CSFloat occasionally rotates):
 *   GET https://csfloat.com/api/v1/listings?market_hash_name=<name>&sort_by=lowest_price&limit=1
 */
type ListingsResponse = {
  data?: Array<{
    price?: number; // cents
    item?: { market_hash_name?: string };
  }>;
};

async function fetchOne(name: string, signal?: AbortSignal): Promise<PriceQuote> {
  const fetchedAt = Date.now();
  const url =
    `https://csfloat.com/api/v1/listings` +
    `?market_hash_name=${encodeURIComponent(name)}` +
    `&sort_by=lowest_price&limit=1`;
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        "user-agent": "cs2-case-roi/0.1",
        accept: "application/json",
      },
    });
    if (!res.ok) {
      return { marketHashName: name, source: "csfloat", lowestPrice: null, medianPrice: null, fetchedAt };
    }
    const json = (await res.json()) as ListingsResponse;
    const cents = json.data?.[0]?.price;
    const dollars = typeof cents === "number" ? cents / 100 : null;
    return {
      marketHashName: name,
      source: "csfloat",
      lowestPrice: dollars,
      medianPrice: null,
      fetchedAt,
    };
  } catch {
    return { marketHashName: name, source: "csfloat", lowestPrice: null, medianPrice: null, fetchedAt };
  }
}

async function pMap<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
  delayMsBetweenGroups: number
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const results = await Promise.all(slice.map(worker));
    out.push(...results);
    if (i + concurrency < items.length && delayMsBetweenGroups > 0) {
      await new Promise((r) => setTimeout(r, delayMsBetweenGroups));
    }
  }
  return out;
}

export const csfloatSource: PriceSource = {
  name: "csfloat",
  async fetch(marketHashNames) {
    return pMap(marketHashNames, (n) => fetchOne(n), 3, 150);
  },
};
