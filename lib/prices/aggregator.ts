import type { AggregatedPrice, PriceQuote, PriceSource, SourceName } from "./types";
import { steamSource } from "./steam";
import { skinportSource } from "./skinport";
import { csfloatSource } from "./csfloat";
import {
  getAllCached,
  setCachedQuotes,
  markSourceDown,
  isSourceDown,
} from "@/lib/cache/priceCache";

export const ALL_SOURCES: PriceSource[] = [steamSource, skinportSource, csfloatSource];

export type AggregateOptions = {
  /** Force a re-fetch even if cache is fresh (still persists results). */
  bypassCache?: boolean;
  /**
   * Skip the price-cache layer entirely — no reads, no writes. Used by the
   * dashboard, which prices ~13k names per request and relies on the
   * Skinport source's own in-process catalogue cache instead. Avoids the
   * cost of reading/writing 13k cache rows on every (serverless) request.
   */
  skipCache?: boolean;
  /** Restrict which sources to query. Default: all. */
  sources?: SourceName[];
};

export type AggregateResult = {
  prices: Map<string, AggregatedPrice>;
  sourceStatus: Record<SourceName, "ok" | "down" | "skipped">;
};

/**
 * For each name, returns AggregatedPrice with min across non-null sources.
 *
 * Uses SQLite cache as truth: any cached row newer than the TTL is reused;
 * everything else is fetched live from that source and written back to cache.
 */
export async function aggregate(
  marketHashNames: string[],
  opts: AggregateOptions = {}
): Promise<AggregateResult> {
  const requested = new Set<SourceName>(
    opts.sources ?? ALL_SOURCES.map((s) => s.name)
  );

  const sourceStatus: Record<SourceName, "ok" | "down" | "skipped"> = {
    steam: requested.has("steam") ? "ok" : "skipped",
    csfloat: requested.has("csfloat") ? "ok" : "skipped",
    skinport: requested.has("skinport") ? "ok" : "skipped",
  };

  // For each source, figure out which names are still missing (or stale).
  const perSourceQuotes = new Map<SourceName, Map<string, PriceQuote>>();

  for (const src of ALL_SOURCES) {
    if (!requested.has(src.name)) continue;
    if (await isSourceDown(src.name)) {
      sourceStatus[src.name] = "down";
      perSourceQuotes.set(src.name, new Map());
      continue;
    }

    const cached = opts.bypassCache || opts.skipCache
      ? new Map<string, PriceQuote>()
      : await getAllCached(marketHashNames, src.name);

    // Filter cached → only fresh entries (getAllCached returns all; we filter by TTL)
    const now = Date.now();
    const FRESH_MS = 30 * 60 * 1000;
    const fresh = new Map<string, PriceQuote>();
    for (const [name, q] of cached) {
      if (now - q.fetchedAt <= FRESH_MS) fresh.set(name, q);
    }

    const missing = marketHashNames.filter((n) => !fresh.has(n));
    if (missing.length > 0) {
      try {
        const fetched = await src.fetch(missing);
        if (!opts.skipCache) await setCachedQuotes(fetched);
        for (const q of fetched) fresh.set(q.marketHashName, q);
      } catch (err) {
        console.error(`[aggregator] ${src.name} threw:`, err);
        await markSourceDown(src.name);
        sourceStatus[src.name] = "down";
      }
    }

    perSourceQuotes.set(src.name, fresh);
  }

  const out = new Map<string, AggregatedPrice>();
  for (const name of marketHashNames) {
    const sources: AggregatedPrice["sources"] = [];
    const prices: number[] = [];
    const quantities: number[] = [];
    let maxFetchedAt = 0;
    for (const src of ALL_SOURCES) {
      if (!requested.has(src.name)) continue;
      const q = perSourceQuotes.get(src.name)?.get(name);
      const p = q?.lowestPrice ?? null;
      const qty = q?.quantity ?? null;
      sources.push({ name: src.name, price: p, quantity: qty });
      if (q && q.fetchedAt > maxFetchedAt) maxFetchedAt = q.fetchedAt;
      if (p != null && p > 0) prices.push(p);
      if (qty != null) quantities.push(qty);
    }
    out.set(name, {
      marketHashName: name,
      bestPrice: prices.length > 0 ? Math.min(...prices) : null,
      meanAcrossSources: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
      quantity: quantities.length > 0 ? Math.max(...quantities) : null,
      sources,
      fetchedAt: maxFetchedAt || Date.now(),
    });
  }

  return { prices: out, sourceStatus };
}
