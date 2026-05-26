import type { Rarity } from "@/lib/metadata/types";

/**
 * Official Valve drop probabilities per rarity tier when opening a CS2
 * weapon case. These numbers come from Valve's publicly stated odds.
 *
 * Sum = 1.0000.
 */
export const TIER_PROBABILITY: Record<Rarity, number> = {
  mil_spec: 0.7992,
  restricted: 0.1598,
  classified: 0.032,
  covert: 0.0064,
  rare_special: 0.0026,
};

/** Per-roll probability that the unboxed skin is a StatTrak variant. */
export const STAT_TRAK_PROBABILITY = 0.1;

/**
 * Fallback multiplier used to estimate the StatTrak price when no
 * direct StatTrak listing is available. ~1.4x is the long-run average
 * observed across the Steam community market for popular cases.
 */
export const STAT_TRAK_FALLBACK_MULTIPLIER = 1.4;

/**
 * Valve's fixed retail price for a CS2 case key, in USD.
 *
 * As of October 2019, all newly-purchased case keys are flagged
 * non-tradeable / non-marketable, so they don't appear on the Steam
 * Community Market, CSFloat, or Skinport. The only way to obtain a
 * usable key is to buy it from Valve in the in-game store at this
 * fixed price.
 */
export const KEY_PRICE_USD = 2.5;
