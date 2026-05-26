export type SourceName = "steam" | "csfloat" | "skinport";

export type PriceQuote = {
  marketHashName: string;
  source: SourceName;
  /** Lowest live ask, in USD. null when the source has no listing. */
  lowestPrice: number | null;
  /** Median / "median_price" if the source exposes one, else null. */
  medianPrice: number | null;
  /** unix ms */
  fetchedAt: number;
};

export interface PriceSource {
  readonly name: SourceName;
  /**
   * Fetches quotes for a batch of market_hash_names. Implementations
   * may parallelise or pull a single full-catalog blob, whichever is
   * cheaper for that vendor.
   */
  fetch(marketHashNames: string[]): Promise<PriceQuote[]>;
}

export type AggregatedPrice = {
  marketHashName: string;
  /** min lowestPrice across sources that returned a value. null if all sources failed. */
  bestPrice: number | null;
  /** Simple mean of lowestPrice across sources that returned a value. */
  meanAcrossSources: number | null;
  sources: { name: SourceName; price: number | null }[];
  fetchedAt: number;
};
