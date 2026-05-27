import fs from "node:fs";
import path from "node:path";
import type { HistoryPoint, PriceHistory } from "./types";

const useKv = !!process.env.KV_REST_API_URL;
const MAX_DAYS = 365;

type Kv = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
};
let kvClient: Kv | null = null;
async function kv(): Promise<Kv> {
  if (kvClient) return kvClient;
  const mod = await import("@vercel/kv");
  kvClient = mod.kv as unknown as Kv;
  return kvClient;
}

const histKey = (name: string) => `hist:${name}`;

let fixture: Record<string, PriceHistory> | null = null;
function loadFixture(): Record<string, PriceHistory> {
  if (fixture) return fixture;
  try {
    const p = path.resolve(process.cwd(), "data", "history.sample.json");
    fixture = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, PriceHistory>;
  } catch {
    fixture = {};
  }
  return fixture;
}

export async function getHistory(name: string): Promise<PriceHistory> {
  if (useKv) return (await (await kv()).get<PriceHistory>(histKey(name))) ?? [];
  return loadFixture()[name] ?? [];
}

export async function getHistories(names: string[]): Promise<Map<string, PriceHistory>> {
  const out = new Map<string, PriceHistory>();
  if (names.length === 0) return out;
  if (useKv) {
    const rows = await (await kv()).mget<PriceHistory>(...names.map(histKey));
    names.forEach((n, i) => out.set(n, rows[i] ?? []));
    return out;
  }
  const fx = loadFixture();
  for (const n of names) out.set(n, fx[n] ?? []);
  return out;
}

/** Append/replace today's point and trim to MAX_DAYS. KV only. */
export async function appendPoint(name: string, point: HistoryPoint): Promise<void> {
  if (!useKv) return;
  const client = await kv();
  const existing = (await client.get<PriceHistory>(histKey(name))) ?? [];
  const filtered = existing.filter((pt) => pt.d !== point.d);
  filtered.push(point);
  filtered.sort((a, b) => a.d.localeCompare(b.d));
  await client.set(histKey(name), filtered.slice(-MAX_DAYS));
}

/** Replace an entire series (used by the backfill). KV only. */
export async function setHistory(name: string, history: PriceHistory): Promise<void> {
  if (!useKv) return;
  await (await kv()).set(histKey(name), history.slice(-MAX_DAYS));
}
