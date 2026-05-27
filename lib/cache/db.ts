/**
 * Async key/value cache. Two backends:
 *  - Vercel KV (Redis) when KV_REST_API_URL is set (production / preview).
 *  - JSON file under ./data (or /tmp on serverless) otherwise (local dev, tests).
 * The exported surface is identical and async regardless of backend.
 */
import fs from "node:fs";
import path from "node:path";
import type { SourceName } from "@/lib/prices/types";

export type PriceRow = {
  lowestPrice: number | null;
  medianPrice: number | null;
  quantity: number | null;
  fetchedAt: number;
};

const useKv = !!process.env.KV_REST_API_URL;

// ---- KV backend (lazy import so dev/tests don't need the package configured) ----
type Kv = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
};
let kvClient: Kv | null = null;
async function kv(): Promise<Kv> {
  if (kvClient) return kvClient;
  const mod = await import("@vercel/kv");
  kvClient = mod.kv as unknown as Kv;
  return kvClient;
}

export function keyFor(source: SourceName, name: string): string {
  return `price:${source}:${name}`;
}

// ---- JSON backend (dev) ----
type Store = { prices: Record<string, PriceRow>; sourceStatus: Record<string, number> };
const EMPTY: Store = { prices: {}, sourceStatus: {} };
let store: Store | null = null;
let storePath: string | null = null;
let dirty = false;

function ensureLoaded(): Store {
  if (store) return store;
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const dir = isServerless ? "/tmp" : path.resolve(process.cwd(), "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* read-only fs */
  }
  storePath = path.join(dir, "cache.json");
  if (fs.existsSync(storePath)) {
    try {
      store = JSON.parse(fs.readFileSync(storePath, "utf8")) as Store;
      store.prices ??= {};
      store.sourceStatus ??= {};
    } catch {
      store = structuredClone(EMPTY);
    }
  } else {
    store = structuredClone(EMPTY);
  }
  return store;
}

function flushJson() {
  if (!store || !storePath || !dirty) return;
  try {
    fs.writeFileSync(storePath, JSON.stringify(store));
  } catch {
    /* read-only fs — in-memory cache still serves this instance */
  }
  dirty = false;
}

// ---- Unified async API ----
export async function getRow(source: SourceName, name: string): Promise<PriceRow | null> {
  if (useKv) return (await (await kv()).get<PriceRow>(keyFor(source, name))) ?? null;
  return ensureLoaded().prices[keyFor(source, name)] ?? null;
}

export async function setRow(source: SourceName, name: string, row: PriceRow): Promise<void> {
  if (useKv) {
    await (await kv()).set(keyFor(source, name), row);
    return;
  }
  const s = ensureLoaded();
  s.prices[keyFor(source, name)] = row;
  dirty = true;
  flushJson();
}

export async function getRows(source: SourceName, names: string[]): Promise<Map<string, PriceRow>> {
  const out = new Map<string, PriceRow>();
  if (names.length === 0) return out;
  if (useKv) {
    const keys = names.map((n) => keyFor(source, n));
    const rows = await (await kv()).mget<PriceRow>(...keys);
    names.forEach((n, i) => {
      if (rows[i]) out.set(n, rows[i] as PriceRow);
    });
    return out;
  }
  const s = ensureLoaded();
  for (const n of names) {
    const r = s.prices[keyFor(source, n)];
    if (r) out.set(n, r);
  }
  return out;
}

export async function deleteByName(names: string[]): Promise<void> {
  if (names.length === 0) return;
  if (useKv) {
    const sources: SourceName[] = ["steam", "csfloat", "skinport"];
    const keys = names.flatMap((n) => sources.map((s) => keyFor(s, n)));
    await (await kv()).del(...keys);
    return;
  }
  const s = ensureLoaded();
  const set = new Set(names);
  for (const key of Object.keys(s.prices)) {
    const parts = key.split(":");
    const n = parts.slice(2).join(":");
    if (set.has(n)) delete s.prices[key];
  }
  dirty = true;
  flushJson();
}

export async function setSourceDown(source: SourceName, downUntil: number): Promise<void> {
  if (useKv) {
    await (await kv()).set(`srcdown:${source}`, downUntil);
    return;
  }
  const s = ensureLoaded();
  s.sourceStatus[source] = downUntil;
  dirty = true;
  flushJson();
}

export async function getSourceDown(source: SourceName): Promise<number | null> {
  if (useKv) return (await (await kv()).get<number>(`srcdown:${source}`)) ?? null;
  return ensureLoaded().sourceStatus[source] ?? null;
}

export async function maxFetchedAt(): Promise<number | null> {
  if (useKv) return Date.now();
  const s = ensureLoaded();
  let max = 0;
  for (const k in s.prices) if (s.prices[k].fetchedAt > max) max = s.prices[k].fetchedAt;
  return max > 0 ? max : null;
}

/** Test helper (JSON mode only). */
export function closeDb(): void {
  flushJson();
  store = null;
  storePath = null;
}
