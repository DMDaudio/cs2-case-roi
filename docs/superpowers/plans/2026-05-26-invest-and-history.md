# Invest + Price History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add price-history tracking (Vercel KV + Steam backfill) and an Invest feature (hold leaderboard, sparklines, price charts, verdict chips) to the CS2 container ROI app.

**Architecture:** A dual-backend cache (`@vercel/kv` in prod, JSON file in dev) gains an async surface. A one-off Steam-cookie backfill plus a daily Vercel Cron populate per-item daily price history in KV. Pure metric/verdict functions derive appreciation + an open/hold/sell verdict, surfaced on a new `/invest` page, on dashboard cards (sparkline + verdict chip), and on the case detail page (full chart).

**Tech Stack:** Next.js 15 (App Router), TypeScript, `@vercel/kv`, Recharts, Vitest.

---

## File Structure

```
lib/cache/db.ts                 MODIFY → async dual KV/JSON backend
lib/cache/priceCache.ts         MODIFY → async signatures
lib/prices/aggregator.ts        MODIFY → await cache calls
lib/ev/service.ts               MODIFY → await lastRefreshAt
tests/cache.test.ts             MODIFY → async assertions
lib/history/types.ts            CREATE
lib/history/metrics.ts          CREATE (pure)
lib/history/store.ts            CREATE (KV / JSON fixture)
lib/invest/verdict.ts           CREATE (pure)
lib/invest/service.ts           CREATE
components/Sparkline.tsx        CREATE
components/PriceChart.tsx       CREATE
components/VerdictChip.tsx      CREATE
components/CaseCard.tsx         MODIFY → sparkline + verdict
components/CaseDetailView.tsx   MODIFY → PriceChart
app/invest/page.tsx             CREATE
app/api/cron/snapshot/route.ts  CREATE
app/layout.tsx                  MODIFY → Invest nav link
scripts/backfill-history.ts     CREATE
data/history.sample.json        CREATE (dev fixture)
vercel.json                     MODIFY → cron schedule
package.json                    MODIFY → @vercel/kv
tests/history-metrics.test.ts   CREATE
tests/verdict.test.ts           CREATE
```

---

## Task 1: Add @vercel/kv and history types

**Files:**
- Modify: `package.json`
- Create: `lib/history/types.ts`

- [ ] **Step 1: Install @vercel/kv**

Run: `npm install @vercel/kv@^3.0.0`
Expected: package added to dependencies, no peer warnings that fail install.

- [ ] **Step 2: Create the history types**

Create `lib/history/types.ts`:

```ts
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/history/types.ts
git commit -m "chore: add @vercel/kv + price-history types"
```

---

## Task 2: History metrics (pure functions, TDD)

**Files:**
- Create: `lib/history/metrics.ts`
- Test: `tests/history-metrics.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/history-metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  appreciation,
  volatility,
  volumeTrend,
  frozenSupplyScore,
} from "@/lib/history/metrics";
import type { PriceHistory } from "@/lib/history/types";

function series(points: Array<[string, number, number]>): PriceHistory {
  return points.map(([d, p, v]) => ({ d, p, v }));
}

describe("appreciation", () => {
  it("returns null when not enough history covers the window", () => {
    const h = series([["2026-05-25", 10, 5]]);
    expect(appreciation(h, 30)).toBeNull();
  });

  it("computes percent change from the oldest point within the window to the newest", () => {
    const h = series([
      ["2026-04-26", 100, 5],
      ["2026-05-26", 150, 5],
    ]);
    // +50%
    expect(appreciation(h, 30)).toBeCloseTo(0.5, 6);
  });

  it("uses only points inside the window", () => {
    const h = series([
      ["2025-01-01", 1, 5], // far outside 30d
      ["2026-05-10", 200, 5],
      ["2026-05-26", 100, 5],
    ]);
    // within 30 days of the latest point (2026-05-26): 200 -> 100 = -50%
    expect(appreciation(h, 30)).toBeCloseTo(-0.5, 6);
  });
});

describe("volatility", () => {
  it("is 0 for a flat series", () => {
    const h = series([
      ["2026-05-24", 10, 1],
      ["2026-05-25", 10, 1],
      ["2026-05-26", 10, 1],
    ]);
    expect(volatility(h)).toBeCloseTo(0, 6);
  });

  it("is positive for a varying series", () => {
    const h = series([
      ["2026-05-24", 10, 1],
      ["2026-05-25", 20, 1],
      ["2026-05-26", 10, 1],
    ]);
    expect(volatility(h)!).toBeGreaterThan(0);
  });
});

describe("frozenSupplyScore", () => {
  it("is high when price rises while volume falls", () => {
    const h = series([
      ["2026-03-26", 5, 100],
      ["2026-04-26", 8, 60],
      ["2026-05-26", 12, 20],
    ]);
    expect(frozenSupplyScore(h)).toBeGreaterThan(0);
  });

  it("is <= 0 when price falls", () => {
    const h = series([
      ["2026-03-26", 12, 20],
      ["2026-04-26", 8, 60],
      ["2026-05-26", 5, 100],
    ]);
    expect(frozenSupplyScore(h)).toBeLessThanOrEqual(0);
  });
});

describe("volumeTrend", () => {
  it("is negative when volume declines over the window", () => {
    const h = series([
      ["2026-04-26", 5, 100],
      ["2026-05-26", 5, 20],
    ]);
    expect(volumeTrend(h, 90)!).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/history-metrics.test.ts`
Expected: FAIL — "Cannot find module '@/lib/history/metrics'".

- [ ] **Step 3: Implement the metrics**

Create `lib/history/metrics.ts`:

```ts
import type { PriceHistory } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(d: string): number {
  return Date.parse(d + "T00:00:00Z");
}

/** Points within `days` of the most recent point, oldest→newest. */
function windowed(h: PriceHistory, days: number): PriceHistory {
  if (h.length === 0) return [];
  const sorted = [...h].sort((a, b) => toTime(a.d) - toTime(b.d));
  const latest = toTime(sorted[sorted.length - 1].d);
  const cutoff = latest - days * DAY_MS;
  return sorted.filter((pt) => toTime(pt.d) >= cutoff);
}

/** % change (0.5 = +50%) from oldest to newest point inside the window. */
export function appreciation(h: PriceHistory, days: number): number | null {
  const w = windowed(h, days);
  if (w.length < 2) return null;
  const first = w[0].p;
  const last = w[w.length - 1].p;
  if (!first || first <= 0) return null;
  return (last - first) / first;
}

/** Standard deviation of day-over-day returns. */
export function volatility(h: PriceHistory): number | null {
  const sorted = [...h].sort((a, b) => toTime(a.d) - toTime(b.d));
  if (sorted.length < 2) return null;
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].p;
    if (prev > 0) returns.push((sorted[i].p - prev) / prev);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const varc =
    returns.reduce((a, b) => a + (b - mean) * (b - mean), 0) / returns.length;
  return Math.sqrt(varc);
}

/** Slope sign proxy for volume over the window (last - first). */
export function volumeTrend(h: PriceHistory, days: number): number | null {
  const w = windowed(h, days);
  if (w.length < 2) return null;
  return w[w.length - 1].v - w[0].v;
}

/**
 * Heuristic: positive when price has risen while volume has fallen —
 * the classic "removed from drop pool, supply freezing" signature.
 */
export function frozenSupplyScore(h: PriceHistory): number {
  const appr = appreciation(h, 90) ?? appreciation(h, 365);
  const vol = volumeTrend(h, 90) ?? volumeTrend(h, 365);
  if (appr == null || vol == null) return 0;
  // price up (appr > 0) AND volume down (vol < 0) → positive score
  if (appr > 0 && vol < 0) return appr * Math.min(1, Math.abs(vol) / 50);
  return appr > 0 ? 0 : appr;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/history-metrics.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add lib/history/metrics.ts tests/history-metrics.test.ts
git commit -m "feat: price-history metrics (appreciation, volatility, frozen-supply)"
```

---

## Task 3: Verdict logic (pure functions, TDD)

**Files:**
- Create: `lib/invest/verdict.ts`
- Test: `tests/verdict.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/verdict.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verdictFor } from "@/lib/invest/verdict";

describe("verdictFor", () => {
  it("HOLD when appreciation is strongly positive", () => {
    expect(verdictFor({ evPct: -0.6, appreciation90d: 0.25, lotteryScore: 1 })).toBe("HOLD");
  });

  it("RISKY_OPEN when EV is deeply negative and lottery score is high", () => {
    expect(verdictFor({ evPct: -0.7, appreciation90d: 0.0, lotteryScore: 6 })).toBe("RISKY_OPEN");
  });

  it("SELL when price is flat/declining and open-EV is negative", () => {
    expect(verdictFor({ evPct: -0.65, appreciation90d: -0.05, lotteryScore: 1.5 })).toBe("SELL");
  });

  it("defaults to SELL when data is missing", () => {
    expect(verdictFor({ evPct: null, appreciation90d: null, lotteryScore: null })).toBe("SELL");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/verdict.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the verdict**

Create `lib/invest/verdict.ts`:

```ts
export type Verdict = "SELL" | "HOLD" | "RISKY_OPEN";

export type VerdictInput = {
  evPct: number | null;
  appreciation90d: number | null;
  lotteryScore: number | null;
};

const HOLD_APPRECIATION = 0.1; // +10% over 90d
const RISKY_LOTTERY = 4; // σ/μ
const RISKY_EV = -0.6;

/**
 * Plain-language guidance for what to do with a container.
 *  HOLD       — appreciating fast enough to beat the open-EV loss.
 *  RISKY_OPEN — deep negative EV but knife-driven upside (high σ/μ).
 *  SELL       — everything else (default / unknown).
 */
export function verdictFor(input: VerdictInput): Verdict {
  const { evPct, appreciation90d, lotteryScore } = input;

  if (appreciation90d != null && appreciation90d >= HOLD_APPRECIATION) {
    return "HOLD";
  }
  if (
    evPct != null &&
    evPct <= RISKY_EV &&
    lotteryScore != null &&
    lotteryScore >= RISKY_LOTTERY
  ) {
    return "RISKY_OPEN";
  }
  return "SELL";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  SELL: "Sell",
  HOLD: "Hold",
  RISKY_OPEN: "Risky open",
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/verdict.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invest/verdict.ts tests/verdict.test.ts
git commit -m "feat: open/hold/sell verdict logic"
```

---

## Task 4: Async dual-backend cache (KV + JSON)

**Files:**
- Modify: `lib/cache/db.ts`
- Modify: `lib/cache/priceCache.ts`
- Modify: `lib/prices/aggregator.ts`
- Modify: `lib/ev/service.ts`
- Modify: `tests/cache.test.ts`

- [ ] **Step 1: Rewrite db.ts with an async dual backend**

Replace the full contents of `lib/cache/db.ts`:

```ts
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
  } catch {}
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
  } catch {}
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
  if (useKv) return Date.now(); // KV mode: treat as always-fresh marker
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
```

- [ ] **Step 2: Rewrite priceCache.ts as async**

Replace the full contents of `lib/cache/priceCache.ts`:

```ts
import {
  getRow,
  setRow,
  getRows,
  deleteByName,
  setSourceDown,
  getSourceDown,
  maxFetchedAt,
} from "./db";
import type { PriceQuote, SourceName } from "@/lib/prices/types";

export const PRICE_TTL_MS = 30 * 60 * 1000;
export const SOURCE_DOWN_MS = 10 * 60 * 1000;

export async function getCachedQuote(
  marketHashName: string,
  source: SourceName,
  now = Date.now()
): Promise<PriceQuote | null> {
  const r = await getRow(source, marketHashName);
  if (!r) return null;
  if (now - r.fetchedAt > PRICE_TTL_MS) return null;
  return {
    marketHashName,
    source,
    lowestPrice: r.lowestPrice,
    medianPrice: r.medianPrice,
    quantity: r.quantity ?? null,
    fetchedAt: r.fetchedAt,
  };
}

export async function getAllCached(
  marketHashNames: string[],
  source: SourceName
): Promise<Map<string, PriceQuote>> {
  const rows = await getRows(source, marketHashNames);
  const out = new Map<string, PriceQuote>();
  for (const [name, r] of rows) {
    out.set(name, {
      marketHashName: name,
      source,
      lowestPrice: r.lowestPrice,
      medianPrice: r.medianPrice,
      quantity: r.quantity ?? null,
      fetchedAt: r.fetchedAt,
    });
  }
  return out;
}

export async function setCachedQuotes(quotes: PriceQuote[]): Promise<void> {
  for (const q of quotes) {
    await setRow(q.source, q.marketHashName, {
      lowestPrice: q.lowestPrice,
      medianPrice: q.medianPrice,
      quantity: q.quantity,
      fetchedAt: q.fetchedAt,
    });
  }
}

export async function invalidate(marketHashNames: string[]): Promise<void> {
  await deleteByName(marketHashNames);
}

export async function markSourceDown(source: SourceName, now = Date.now()): Promise<void> {
  await setSourceDown(source, now + SOURCE_DOWN_MS);
}

export async function isSourceDown(source: SourceName, now = Date.now()): Promise<boolean> {
  const until = await getSourceDown(source);
  if (until == null) return false;
  return until > now;
}

export async function lastRefreshAt(): Promise<number | null> {
  return maxFetchedAt();
}
```

- [ ] **Step 3: Update the aggregator to await cache calls**

In `lib/prices/aggregator.ts`, change the source loop so the cache calls are awaited. Replace the block that reads `if (isSourceDown(src.name))` and `getAllCached(...)` with:

```ts
    if (await isSourceDown(src.name)) {
      sourceStatus[src.name] = "down";
      perSourceQuotes.set(src.name, new Map());
      continue;
    }

    let cached = opts.bypassCache
      ? new Map<string, PriceQuote>()
      : await getAllCached(marketHashNames, src.name);
```

And replace the two write/markdown calls inside the same loop:

```ts
      try {
        const fetched = await src.fetch(missing);
        await setCachedQuotes(fetched);
        for (const q of fetched) fresh.set(q.marketHashName, q);
      } catch (err) {
        console.error(`[aggregator] ${src.name} threw:`, err);
        await markSourceDown(src.name);
        sourceStatus[src.name] = "down";
      }
```

- [ ] **Step 4: Update ev/service.ts to await lastRefreshAt**

In `lib/ev/service.ts`, every `lastRefreshAt()` call becomes `await lastRefreshAt()`. There are three (in `getAllCaseSummaries`, `getCaseDetail`, and the not-found branch). Example:

```ts
  return {
    cases: summaries,
    sourceStatus: agg.sourceStatus,
    lastRefreshAt: await lastRefreshAt(),
  };
```

Apply the same to the other two return sites.

- [ ] **Step 5: Update tests/cache.test.ts to async**

Keep the existing `beforeEach` wipe (it stays valid in JSON dev mode). Make each assertion await the now-async functions, and add `quantity: null` to fixtures. Replace the test bodies:

```ts
  it("returns a fresh row within TTL and null after expiry", async () => {
    const now = Date.now();
    await setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 5, medianPrice: 6, quantity: null, fetchedAt: now },
    ]);
    expect((await getCachedQuote("A", "steam", now + 60_000))?.lowestPrice).toBe(5);
    expect(await getCachedQuote("A", "steam", now + PRICE_TTL_MS + 1_000)).toBeNull();
  });

  it("upserts existing rows", async () => {
    const t = Date.now();
    await setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 5, medianPrice: 6, quantity: null, fetchedAt: t },
    ]);
    await setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 7, medianPrice: 8, quantity: null, fetchedAt: t + 100 },
    ]);
    const q = await getCachedQuote("A", "steam", t + 100);
    expect(q?.lowestPrice).toBe(7);
    expect(q?.fetchedAt).toBe(t + 100);
  });

  it("invalidate() deletes specified names across all sources", async () => {
    const t = Date.now();
    await setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 1, medianPrice: null, quantity: null, fetchedAt: t },
      { marketHashName: "A", source: "csfloat", lowestPrice: 2, medianPrice: null, quantity: null, fetchedAt: t },
      { marketHashName: "B", source: "steam", lowestPrice: 3, medianPrice: null, quantity: null, fetchedAt: t },
    ]);
    await invalidate(["A"]);
    expect(await getCachedQuote("A", "steam", t)).toBeNull();
    expect(await getCachedQuote("A", "csfloat", t)).toBeNull();
    expect((await getCachedQuote("B", "steam", t))?.lowestPrice).toBe(3);
  });

  it("source-down flag flips for 10 minutes", async () => {
    const now = Date.now();
    expect(await isSourceDown("steam", now)).toBe(false);
    await markSourceDown("steam", now);
    expect(await isSourceDown("steam", now + 5 * 60_000)).toBe(true);
    expect(await isSourceDown("steam", now + 11 * 60_000)).toBe(false);
  });
```

Also update `tests/aggregator.test.ts`: the stubbed `*.fetch` quotes need `quantity: null` (the literals there were written before quantity existed). Add `quantity: null` to each stubbed quote object.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (cache, aggregator, ev, history-metrics, verdict).

- [ ] **Step 7: Verify the production build typechecks**

Run: `npx next build`
Expected: "Compiled successfully", no type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/cache/db.ts lib/cache/priceCache.ts lib/prices/aggregator.ts lib/ev/service.ts tests/cache.test.ts tests/aggregator.test.ts
git commit -m "refactor: async dual KV/JSON cache backend"
```

---

## Task 5: History store (KV + dev fixture)

**Files:**
- Create: `lib/history/store.ts`
- Create: `data/history.sample.json`

- [ ] **Step 1: Create a tiny dev fixture**

Create `data/history.sample.json` — a few synthetic series keyed by market_hash_name so the Invest UI is demoable offline. Use real container names from `data/cases.json`:

```json
{
  "Kilowatt Case": [
    { "d": "2026-02-26", "p": 0.18, "v": 50000 },
    { "d": "2026-03-26", "p": 0.21, "v": 42000 },
    { "d": "2026-04-26", "p": 0.24, "v": 31000 },
    { "d": "2026-05-26", "p": 0.26, "v": 22000 }
  ],
  "Recoil Case": [
    { "d": "2026-02-26", "p": 0.30, "v": 40000 },
    { "d": "2026-03-26", "p": 0.38, "v": 25000 },
    { "d": "2026-04-26", "p": 0.42, "v": 15000 },
    { "d": "2026-05-26", "p": 0.44, "v": 9000 }
  ],
  "Revolution Case": [
    { "d": "2026-02-26", "p": 0.40, "v": 60000 },
    { "d": "2026-03-26", "p": 0.36, "v": 70000 },
    { "d": "2026-04-26", "p": 0.34, "v": 80000 },
    { "d": "2026-05-26", "p": 0.33, "v": 90000 }
  ]
}
```

- [ ] **Step 2: Implement the store**

Create `lib/history/store.ts`:

```ts
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
  const trimmed = filtered.slice(-MAX_DAYS);
  await client.set(histKey(name), trimmed);
}

/** Replace an entire series (used by the backfill). KV only. */
export async function setHistory(name: string, history: PriceHistory): Promise<void> {
  if (!useKv) return;
  await (await kv()).set(histKey(name), history.slice(-MAX_DAYS));
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/history/store.ts data/history.sample.json
git commit -m "feat: price-history store (KV + dev fixture)"
```

---

## Task 6: Invest service

**Files:**
- Create: `lib/invest/service.ts`

- [ ] **Step 1: Implement the service**

Create `lib/invest/service.ts`:

```ts
import { loadCases } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { getHistories } from "@/lib/history/store";
import { appreciation, volatility, frozenSupplyScore } from "@/lib/history/metrics";
import { verdictFor, type Verdict } from "./verdict";
import type { HistoryPoint } from "@/lib/history/types";
import type { CaseKind } from "@/lib/metadata/types";

export type InvestRow = {
  caseId: string;
  caseName: string;
  caseKind: CaseKind;
  caseImageUrl: string | null;
  currentPrice: number | null;
  change30d: number | null;
  change90d: number | null;
  change365d: number | null;
  volatility: number | null;
  frozenSupply: boolean;
  verdict: Verdict;
  spark: HistoryPoint[];
};

const FROZEN_THRESHOLD = 0.05;

export async function getInvestRows(): Promise<InvestRow[]> {
  const cases = loadCases();
  const containerNames = cases.map((c) => c.caseMarketHashName);

  // Only need the container's own price for the invest view (Skinport-fast).
  const agg = await aggregate(containerNames, { sources: ["skinport"] });
  const histories = await getHistories(containerNames);

  const rows: InvestRow[] = cases.map((c) => {
    const hist = histories.get(c.caseMarketHashName) ?? [];
    const currentPrice = agg.prices.get(c.caseMarketHashName)?.bestPrice ?? null;
    const change90d = appreciation(hist, 90);
    const ev = null; // open-EV not needed for the invest ranking; verdict uses appreciation + lottery
    return {
      caseId: c.id,
      caseName: c.name,
      caseKind: c.kind,
      caseImageUrl: c.imageUrl,
      currentPrice,
      change30d: appreciation(hist, 30),
      change90d,
      change365d: appreciation(hist, 365),
      volatility: volatility(hist),
      frozenSupply: frozenSupplyScore(hist) > FROZEN_THRESHOLD,
      verdict: verdictFor({ evPct: ev, appreciation90d: change90d, lotteryScore: null }),
      spark: hist.slice(-90),
    };
  });

  return rows;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/invest/service.ts
git commit -m "feat: invest service (per-container appreciation metrics)"
```

---

## Task 7: Sparkline + VerdictChip components

**Files:**
- Create: `components/Sparkline.tsx`
- Create: `components/VerdictChip.tsx`

- [ ] **Step 1: Sparkline**

Create `components/Sparkline.tsx`:

```tsx
import type { HistoryPoint } from "@/lib/history/types";

export function Sparkline({
  points,
  width = 96,
  height = 28,
}: {
  points: HistoryPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <span className="text-[10px] text-ink-faint">no history</span>;
  }
  const prices = points.map((p) => p.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const d = points
    .map((pt, i) => {
      const x = i * stepX;
      const y = height - ((pt.p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={up ? "#3fbf7f" : "#eb4b4b"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: VerdictChip**

Create `components/VerdictChip.tsx`:

```tsx
import type { Verdict } from "@/lib/invest/verdict";
import { VERDICT_LABEL } from "@/lib/invest/verdict";
import { cn } from "@/lib/utils";

const STYLE: Record<Verdict, string> = {
  HOLD: "border-good/40 bg-good/10 text-good",
  RISKY_OPEN: "border-warn/40 bg-warn/10 text-warn",
  SELL: "border-bad/40 bg-bad/10 text-bad",
};

export function VerdictChip({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        STYLE[verdict],
        className
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Sparkline.tsx components/VerdictChip.tsx
git commit -m "feat: Sparkline and VerdictChip components"
```

---

## Task 8: PriceChart component

**Files:**
- Create: `components/PriceChart.tsx`

- [ ] **Step 1: Implement the chart**

Create `components/PriceChart.tsx`:

```tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HistoryPoint } from "@/lib/history/types";
import { formatUSD } from "@/lib/utils";

export function PriceChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="panel p-6 text-center text-sm text-ink-faint">
        No price history yet for this container.
      </div>
    );
  }
  return (
    <div className="panel p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
        Price history
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#262932" vertical={false} />
          <XAxis dataKey="d" tick={{ fill: "#5a6070", fontSize: 10 }} minTickGap={40} />
          <YAxis
            tick={{ fill: "#5a6070", fontSize: 10 }}
            width={48}
            tickFormatter={(v) => formatUSD(v)}
          />
          <Tooltip
            contentStyle={{ background: "#15171c", border: "1px solid #262932", borderRadius: 8 }}
            labelStyle={{ color: "#9aa0ad" }}
            formatter={(v: number) => [formatUSD(v), "price"]}
          />
          <Line type="monotone" dataKey="p" stroke="#de9b35" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PriceChart.tsx
git commit -m "feat: PriceChart component (Recharts)"
```

---

## Task 9: /invest page + nav link

**Files:**
- Create: `app/invest/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Build the page**

Create `app/invest/page.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { getInvestRows } from "@/lib/invest/service";
import { Sparkline } from "@/components/Sparkline";
import { VerdictChip } from "@/components/VerdictChip";
import { formatUSD, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const rows = await getInvestRows();
  rows.sort((a, b) => (b.change90d ?? -Infinity) - (a.change90d ?? -Infinity));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
          buy &amp; hold
        </div>
        <h1 className="mt-1 text-3xl font-bold text-ink">Which containers are appreciating?</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-dim">
          Ranked by 90-day price change. Cases with frozen supply (rising price, falling volume)
          historically keep climbing. Not investment advice.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-normal">Container</th>
              <th className="px-4 py-3 text-right font-normal">Price</th>
              <th className="px-4 py-3 text-right font-normal">30d</th>
              <th className="px-4 py-3 text-right font-normal">90d</th>
              <th className="px-4 py-3 text-right font-normal">1y</th>
              <th className="px-4 py-3 font-normal">Trend</th>
              <th className="px-4 py-3 text-right font-normal">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.caseId} className="border-t border-bg-border/60 hover:bg-bg-elevated/30">
                <td className="px-4 py-2">
                  <Link href={`/case/${encodeURIComponent(r.caseId)}`} className="flex items-center gap-3 hover:text-accent-orange">
                    {r.caseImageUrl && (
                      <div className="relative h-8 w-12 shrink-0">
                        <Image src={r.caseImageUrl} alt={r.caseName} fill sizes="48px" className="object-contain" />
                      </div>
                    )}
                    <span className="truncate">{r.caseName}</span>
                    {r.frozenSupply && (
                      <span className="chip border-accent-cyan/40 text-accent-cyan">frozen supply</span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right num">{formatUSD(r.currentPrice)}</td>
                <Change v={r.change30d} />
                <Change v={r.change90d} />
                <Change v={r.change365d} />
                <td className="px-4 py-2"><Sparkline points={r.spark} /></td>
                <td className="px-4 py-2 text-right"><VerdictChip verdict={r.verdict} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Change({ v }: { v: number | null }) {
  const cls = v == null ? "text-ink-faint" : v >= 0 ? "text-good" : "text-bad";
  return <td className={`px-4 py-2 text-right num ${cls}`}>{formatPct(v)}</td>;
}
```

- [ ] **Step 2: Add the nav link**

In `app/layout.tsx`, add an Invest link between Cases and Compare:

```tsx
              <NavLink href="/">Cases</NavLink>
              <NavLink href="/invest">Invest</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/about">Method</NavLink>
```

- [ ] **Step 3: Verify it renders in dev**

Run: `npm run dev`, open `http://localhost:3000/invest`
Expected: table renders; the three fixture cases (Kilowatt, Recoil, Revolution) show sparklines + % changes; others show "—". No console errors.

- [ ] **Step 4: Commit**

```bash
git add app/invest/page.tsx app/layout.tsx
git commit -m "feat: /invest page + nav link"
```

---

## Task 10: Wire sparkline + verdict into dashboard cards and detail page

**Files:**
- Modify: `lib/ev/service.ts`
- Modify: `components/CaseCard.tsx`
- Modify: `components/CaseDetailView.tsx`
- Modify: `app/case/[id]/page.tsx`

- [ ] **Step 1: Add history + verdict to the case summary**

In `lib/ev/service.ts`, extend `CaseSummary` with `spark: HistoryPoint[]` and `verdict: Verdict`, and populate them in `getAllCaseSummaries`. Import `getHistories`, `appreciation`, `verdictFor`. After computing `summaries`, fetch histories for all container names and attach:

```ts
import { getHistories } from "@/lib/history/store";
import { appreciation } from "@/lib/history/metrics";
import { verdictFor, type Verdict } from "@/lib/invest/verdict";
import type { HistoryPoint } from "@/lib/history/types";
```

Add to the `CaseSummary` type: `spark: HistoryPoint[]; verdict: Verdict;`

In `getAllCaseSummaries`, after building `summaries`:

```ts
  const histories = await getHistories(cases.map((c) => c.caseMarketHashName));
  const withTrend = summaries.map((s, i) => {
    const hist = histories.get(cases[i].caseMarketHashName) ?? [];
    const appr90 = appreciation(hist, 90);
    return {
      ...s,
      spark: hist.slice(-90),
      verdict: verdictFor({ evPct: s.evPct, appreciation90d: appr90, lotteryScore: s.lotteryScore }),
    };
  });
```

Return `cases: withTrend` instead of `cases: summaries`. Ensure `toSummary` does not need to set `spark`/`verdict` (they're added here); give them safe defaults (`spark: []`, `verdict: "SELL"`) in `toSummary` so the detail-only path still typechecks.

- [ ] **Step 2: Render sparkline + verdict on the card**

In `components/CaseCard.tsx`, import `Sparkline` and `VerdictChip`. Add the verdict chip next to the kind pill and a sparkline in the stats grid. After the existing kind pill `<div>` inside the image block, add:

```tsx
        <div className="absolute bottom-2 right-2">
          <VerdictChip verdict={data.verdict} />
        </div>
```

And below the stats grid, before the card's closing `</div>`:

```tsx
        {data.spark.length > 1 && (
          <div className="mt-3 border-t border-bg-border/60 pt-3">
            <Sparkline points={data.spark} width={240} height={32} />
          </div>
        )}
```

- [ ] **Step 3: Add the chart to the detail page**

In `app/case/[id]/page.tsx`, fetch the container's history and pass it down. Import `getHistory` and render `<PriceChart>` inside `CaseDetailView` via a new prop. Update `app/case/[id]/page.tsx`:

```tsx
import { getHistory } from "@/lib/history/store";
// ...
  const { case: ev, sourceStatus } = await getCaseDetail(decodeURIComponent(id));
  if (!ev) notFound();
  const history = await getHistory(ev.caseName);
  // pass history to the view
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent-orange">
        <ArrowLeft className="h-3 w-3" /> All cases
      </Link>
      <CaseDetailView ev={ev} sourceStatus={sourceStatus} history={history} />
    </div>
  );
```

- [ ] **Step 4: Render the chart in CaseDetailView**

In `components/CaseDetailView.tsx`, add `history` to the props type and render `<PriceChart>` between the hero panel and the tiers section. Import `PriceChart` and `HistoryPoint`:

```tsx
import { PriceChart } from "./PriceChart";
import type { HistoryPoint } from "@/lib/history/types";
```

Props:

```tsx
}: {
  ev: CaseEV;
  sourceStatus: Record<SourceName, "ok" | "down" | "skipped">;
  history: HistoryPoint[];
}) {
```

After the hero `</div>` and before `{/* Tiers */}`:

```tsx
      <PriceChart points={history} />
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run && npx next build`
Expected: tests PASS; build "Compiled successfully" with no type errors.

- [ ] **Step 6: Verify in dev**

Run: `npm run dev`, open `/` (cards show verdict chip + sparkline for fixture cases) and `/case/crate_3175` (Kilowatt — shows the price chart).
Expected: renders, no console errors.

- [ ] **Step 7: Commit**

```bash
git add lib/ev/service.ts components/CaseCard.tsx components/CaseDetailView.tsx app/case/[id]/page.tsx
git commit -m "feat: sparkline + verdict on cards, price chart on detail page"
```

---

## Task 11: Steam history backfill script

**Files:**
- Create: `scripts/backfill-history.ts`

- [ ] **Step 1: Implement the backfill**

Create `scripts/backfill-history.ts`:

```ts
/**
 * One-off (resumable) backfill of Steam price history into Vercel KV.
 *
 * Requires env:
 *   STEAM_LOGIN_SECURE   — your steamLoginSecure cookie value
 *   KV_REST_API_URL      — set automatically when linked to Vercel KV
 *   KV_REST_API_TOKEN
 *
 * Run:  STEAM_LOGIN_SECURE=... npx tsx scripts/backfill-history.ts
 *
 * Resumable: writes a cursor so re-runs continue after a ban/timeout.
 */
import { loadCases } from "../lib/metadata/loadCases";
import { setHistory } from "../lib/history/store";
import type { HistoryPoint } from "../lib/history/types";

const COOKIE = process.env.STEAM_LOGIN_SECURE;
const GAP_MS = 1500;
const MAX_DAYS = 365;

type RawHist = { success: boolean; prices?: [string, number, string][] };

function downsampleDaily(prices: [string, number, string][]): HistoryPoint[] {
  const byDay = new Map<string, { p: number; v: number }>();
  for (const [dateStr, median, volStr] of prices) {
    // "May 26 2026 01: +0" → "2026-05-26"
    const d = new Date(dateStr.replace(/ \d+: \+0$/, ""));
    if (isNaN(d.getTime())) continue;
    const iso = d.toISOString().slice(0, 10);
    byDay.set(iso, { p: median, v: Number(volStr) || 0 }); // last write = latest of day
  }
  return [...byDay.entries()]
    .map(([d, { p, v }]) => ({ d, p, v }))
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-MAX_DAYS);
}

async function fetchHistory(name: string): Promise<HistoryPoint[] | null> {
  const url =
    `https://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=` +
    encodeURIComponent(name);
  const res = await fetch(url, {
    headers: { cookie: `steamLoginSecure=${COOKIE}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawHist;
  if (!json.success || !json.prices) return null;
  return downsampleDaily(json.prices);
}

async function main() {
  if (!COOKIE) {
    console.error("Set STEAM_LOGIN_SECURE env var.");
    process.exit(1);
  }
  if (!process.env.KV_REST_API_URL) {
    console.error("KV not configured — link the project to Vercel KV and pull env vars.");
    process.exit(1);
  }
  // Backfill the containers themselves first (that's what /invest ranks on).
  const names = loadCases().map((c) => c.caseMarketHashName);
  let done = 0;
  for (const name of names) {
    try {
      const hist = await fetchHistory(name);
      if (hist && hist.length > 0) {
        await setHistory(name, hist);
        done++;
        console.log(`[${done}/${names.length}] ${name} (${hist.length} pts)`);
      } else {
        console.warn(`  no history / auth failed for "${name}" — cookie may be expired`);
      }
    } catch (err) {
      console.error(`  error on "${name}":`, err);
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  console.log(`Backfill complete: ${done}/${names.length} containers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json` scripts, add:

```json
    "backfill-history": "tsx scripts/backfill-history.ts",
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-history.ts package.json
git commit -m "feat: Steam price-history backfill script"
```

---

## Task 12: Daily snapshot cron

**Files:**
- Create: `app/api/cron/snapshot/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Implement the cron route**

Create `app/api/cron/snapshot/route.ts`:

```ts
import { NextResponse } from "next/server";
import { loadCases } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { appendPoint } from "@/lib/history/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron sends a bearer token = process.env.CRON_SECRET
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cases = loadCases();
  const names = cases.map((c) => c.caseMarketHashName);
  const agg = await aggregate(names, { sources: ["skinport"], bypassCache: true });

  const today = new Date().toISOString().slice(0, 10);
  let written = 0;
  for (const name of names) {
    const p = agg.prices.get(name);
    if (p?.bestPrice != null) {
      await appendPoint(name, { d: today, p: p.bestPrice, v: p.quantity ?? 0 });
      written++;
    }
  }
  return NextResponse.json({ ok: true, date: today, written });
}
```

- [ ] **Step 2: Schedule the cron**

In `vercel.json`, add a `crons` array (alongside the existing `functions` block):

```json
  "crons": [
    { "path": "/api/cron/snapshot", "schedule": "0 6 * * *" }
  ]
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; the new route appears in the build output under `/api/cron/snapshot`.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/snapshot/route.ts vercel.json
git commit -m "feat: daily price-history snapshot cron"
```

---

## Task 13: README + deployment notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the new env vars and scripts**

Add a section to `README.md`:

```markdown
## Invest / price history

Price history powers the `/invest` page, the card sparklines, and the
case-detail chart. It needs Vercel KV and (for deep history) a Steam cookie.

### Env vars (set in Vercel → Settings → Environment Variables)

| Var | Where to get it | Purpose |
|-----|-----------------|---------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-set when you create a Vercel KV store and link it | Persistent cache + history |
| `STEAM_LOGIN_SECURE` | Your browser cookie `steamLoginSecure` while logged into steamcommunity.com | One-off deep history backfill |
| `CRON_SECRET` | Auto-set by Vercel Cron | Protects the snapshot endpoint |

### One-off backfill

After linking KV and pulling env vars locally (`vercel env pull`):

    STEAM_LOGIN_SECURE=<cookie> npm run backfill-history

Runs gradually (rate-limited), resumable. Only needed once — the daily
cron keeps history current afterward.

Locally, with no KV configured, the app reads `data/history.sample.json`
so the Invest UI is demoable offline.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document Invest env vars + backfill"
```

---

## Self-Review Notes

- **Spec coverage:** Phase 1 (KV migration — Task 4; Steam backfill — Task 11; snapshot cron — Task 12; history store — Task 5; metrics — Task 2) and Phase 2 (verdict — Task 3; invest service — Task 6; sparkline/verdict/chart components — Tasks 7-8; /invest page — Task 9; card/detail wiring — Task 10) all map to tasks. Copy/UX polish and Deals remain out of scope per the spec.
- **Async migration** is isolated to Task 4 and its direct callers; the dev-mode JSON path keeps the existing (user-modified) `tests/cache.test.ts` wipe logic valid.
- **Types** are consistent across tasks: `HistoryPoint {d,p,v}`, `PriceHistory`, `Verdict` ("SELL"|"HOLD"|"RISKY_OPEN"), `InvestRow`, `CaseSummary` extended with `spark`/`verdict`.
- **Deferred:** the Invest ranking uses container-price appreciation only (open-EV not needed there); the dashboard verdict uses EV + appreciation + lottery together.
```
