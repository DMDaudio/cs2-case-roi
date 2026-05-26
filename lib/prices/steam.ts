import type { PriceQuote, PriceSource } from "./types";

const APP_ID = 730;
const USD = 1; // Steam currency code

function parseMoney(s: string | undefined): number | null {
  if (!s) return null;
  // "$1.23" / "1,23€" / "€ 0,99" → 1.23 / 1.23 / 0.99
  const cleaned = s.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  // assume the last comma or dot is the decimal separator
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const sep = lastDot > lastComma ? "." : lastComma > -1 ? "," : ".";
  const norm =
    sep === ","
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  const n = parseFloat(norm);
  return Number.isFinite(n) ? n : null;
}

async function fetchOne(name: string, signal?: AbortSignal): Promise<PriceQuote> {
  const url =
    `https://steamcommunity.com/market/priceoverview/` +
    `?appid=${APP_ID}&currency=${USD}&market_hash_name=${encodeURIComponent(name)}`;
  const fetchedAt = Date.now();
  try {
    const res = await fetch(url, {
      signal,
      headers: { "user-agent": "cs2-case-roi/0.1" },
    });
    if (!res.ok) {
      return { marketHashName: name, source: "steam", lowestPrice: null, medianPrice: null, quantity: null, fetchedAt };
    }
    const json = (await res.json()) as {
      success?: boolean;
      lowest_price?: string;
      median_price?: string;
    };
    if (!json.success) {
      return { marketHashName: name, source: "steam", lowestPrice: null, medianPrice: null, quantity: null, fetchedAt };
    }
    return {
      marketHashName: name,
      source: "steam",
      lowestPrice: parseMoney(json.lowest_price),
      medianPrice: parseMoney(json.median_price),
      quantity: null,
      fetchedAt,
    };
  } catch {
    return { marketHashName: name, source: "steam", lowestPrice: null, medianPrice: null, quantity: null, fetchedAt };
  }
}

/** Concurrency-limited parallel runner with a small delay between groups. */
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

export const steamSource: PriceSource = {
  name: "steam",
  async fetch(marketHashNames) {
    // Steam Market rate-limits aggressively; ~20 req/min is safe.
    // We use concurrency=2 with a 250ms gap, ~8/sec worst case, but
    // most queries hit the in-process micro-cache or the SQLite cache
    // before they reach this method.
    return pMap(marketHashNames, (n) => fetchOne(n), 2, 250);
  },
};
