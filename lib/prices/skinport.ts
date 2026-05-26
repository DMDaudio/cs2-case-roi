import type { PriceQuote, PriceSource } from "./types";

type SkinportItem = {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null;
  item_page: string;
  market_page: string;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
  created_at: number;
  updated_at: number;
};

let catalogCache: { fetchedAt: number; byName: Map<string, SkinportItem> } | null = null;
const CATALOG_TTL = 15 * 60 * 1000; // Skinport asks clients to cache ≥5 min; 15 is polite

async function loadCatalog(): Promise<Map<string, SkinportItem>> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.fetchedAt < CATALOG_TTL) {
    return catalogCache.byName;
  }
  try {
    const res = await fetch(
      "https://api.skinport.com/v1/items?app_id=730&currency=USD",
      {
        headers: {
          "user-agent": "cs2-case-roi/0.1",
          "accept-encoding": "br",
        },
      }
    );
    if (!res.ok) throw new Error(`skinport ${res.status}`);
    const json = (await res.json()) as SkinportItem[];
    const byName = new Map<string, SkinportItem>();
    for (const it of json) byName.set(it.market_hash_name, it);
    catalogCache = { fetchedAt: now, byName };
    return byName;
  } catch {
    // Return empty map; the aggregator will treat all items as unpriced from this source.
    return new Map();
  }
}

export const skinportSource: PriceSource = {
  name: "skinport",
  async fetch(marketHashNames) {
    const cat = await loadCatalog();
    const fetchedAt = Date.now();
    return marketHashNames.map<PriceQuote>((name) => {
      const item = cat.get(name);
      return {
        marketHashName: name,
        source: "skinport",
        lowestPrice: item?.min_price ?? null,
        medianPrice: item?.median_price ?? null,
        fetchedAt,
      };
    });
  },
};

/** Test/utility hook. */
export function _clearSkinportCatalogCache() {
  catalogCache = null;
}
