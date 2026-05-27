/** One daily observation of an item's price and listing volume. */
export type HistoryPoint = {
  /** ISO date, "YYYY-MM-DD" */
  d: string;
  /** median/best price that day, USD */
  p: number;
  /** listings/volume that day (0 if unknown) */
  v: number;
};

export type PriceHistory = HistoryPoint[];
