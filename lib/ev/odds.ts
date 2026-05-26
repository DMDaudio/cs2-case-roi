import type { Rarity, CaseKind } from "@/lib/metadata/types";

/**
 * Per-kind drop probabilities. Only the tiers used by that kind appear
 * in the map — the calculator iterates over the map's keys, not over
 * the full Rarity union.
 *
 * Weapon cases: Valve-published.
 * Sticker / autograph capsules: Valve-published.
 * Souvenir packages: Valve does not officially publish odds (the drop
 *   is determined by the round watched, not pure RNG). We use the same
 *   geometric distribution Valve uses for weapon cases shifted two
 *   tiers down, which matches community-reverse-engineered estimates.
 */
export const TIER_PROBABILITY_BY_KIND: Record<CaseKind, Partial<Record<Rarity, number>>> = {
  weapon_case: {
    mil_spec: 0.7992,
    restricted: 0.1598,
    classified: 0.032,
    covert: 0.0064,
    rare_special: 0.0026,
  },
  sticker_capsule: {
    high_grade: 0.8,
    remarkable: 0.16,
    exotic: 0.032,
    extraordinary: 0.008,
  },
  autograph_capsule: {
    high_grade: 0.8,
    remarkable: 0.16,
    exotic: 0.032,
    extraordinary: 0.008,
  },
  souvenir_package: {
    consumer: 0.7992,
    industrial: 0.1598,
    mil_spec: 0.032,
    restricted: 0.0064,
    classified: 0.0026,
  },
};

/** Per-roll probability that the unboxed skin is a StatTrak variant. */
export const STAT_TRAK_PROBABILITY = 0.1;

/** Fallback multiplier when no direct StatTrak listing is available. */
export const STAT_TRAK_FALLBACK_MULTIPLIER = 1.4;

/**
 * Valve's fixed retail price for a CS2 case key, in USD. Keys are
 * non-tradeable / non-marketable since October 2019, so the only way
 * to obtain one is from Valve at this fixed price.
 */
export const KEY_PRICE_USD = 2.5;
