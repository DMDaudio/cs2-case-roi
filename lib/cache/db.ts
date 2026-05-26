/**
 * Tiny JSON-file backed key/value store. Replaces what was originally a
 * better-sqlite3 layer; avoids native compilation, which is painful on
 * Windows + bleeding-edge Node. The price cache is tiny (a few thousand
 * rows max), so a flat JSON file is plenty.
 *
 * Schema:
 *   {
 *     "prices": { "<source>|<market_hash_name>": { lowestPrice, medianPrice, fetchedAt } },
 *     "sourceStatus": { "<source>": down_until_unix_ms }
 *   }
 */
import fs from "node:fs";
import path from "node:path";
import type { SourceName } from "@/lib/prices/types";

type PriceRow = {
  lowestPrice: number | null;
  medianPrice: number | null;
  quantity: number | null;
  fetchedAt: number;
};

type Store = {
  prices: Record<string, PriceRow>;
  sourceStatus: Record<string, number>;
};

const EMPTY: Store = { prices: {}, sourceStatus: {} };
let store: Store | null = null;
let storePath: string | null = null;
let dirty = false;
let flushTimer: NodeJS.Timeout | null = null;

function ensureLoaded(): Store {
  if (store) return store;
  const dir = path.resolve(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  storePath = path.join(dir, "cache.json");
  if (fs.existsSync(storePath)) {
    try {
      const raw = fs.readFileSync(storePath, "utf8");
      store = JSON.parse(raw) as Store;
      if (!store.prices) store.prices = {};
      if (!store.sourceStatus) store.sourceStatus = {};
    } catch {
      store = structuredClone(EMPTY);
    }
  } else {
    store = structuredClone(EMPTY);
  }
  return store;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 250);
  // Don't keep the event loop alive just for the cache flush.
  flushTimer.unref?.();
}

export function flush() {
  if (!store || !storePath || !dirty) return;
  fs.writeFileSync(storePath, JSON.stringify(store));
  dirty = false;
}

export function keyFor(source: SourceName, name: string): string {
  return `${source}|${name}`;
}

export function getRow(source: SourceName, name: string): PriceRow | null {
  const s = ensureLoaded();
  return s.prices[keyFor(source, name)] ?? null;
}

export function setRow(source: SourceName, name: string, row: PriceRow) {
  const s = ensureLoaded();
  s.prices[keyFor(source, name)] = row;
  dirty = true;
  scheduleFlush();
}

export function deleteByName(names: string[]) {
  if (names.length === 0) return;
  const s = ensureLoaded();
  const set = new Set(names);
  for (const key of Object.keys(s.prices)) {
    const idx = key.indexOf("|");
    if (idx === -1) continue;
    const n = key.slice(idx + 1);
    if (set.has(n)) delete s.prices[key];
  }
  dirty = true;
  scheduleFlush();
}

export function maxFetchedAt(): number | null {
  const s = ensureLoaded();
  let max = 0;
  for (const k in s.prices) {
    const v = s.prices[k].fetchedAt;
    if (v > max) max = v;
  }
  return max > 0 ? max : null;
}

export function setSourceDown(source: SourceName, downUntil: number) {
  const s = ensureLoaded();
  s.sourceStatus[source] = downUntil;
  dirty = true;
  scheduleFlush();
}

export function getSourceDown(source: SourceName): number | null {
  const s = ensureLoaded();
  return s.sourceStatus[source] ?? null;
}

/** Test helper. */
export function closeDb() {
  flush();
  store = null;
  storePath = null;
}

/** Test helper: read all rows for a given source. */
export function getAllRows(source: SourceName): Map<string, PriceRow> {
  const s = ensureLoaded();
  const m = new Map<string, PriceRow>();
  const prefix = `${source}|`;
  for (const key of Object.keys(s.prices)) {
    if (key.startsWith(prefix)) {
      m.set(key.slice(prefix.length), s.prices[key]);
    }
  }
  return m;
}
