# CS2 Container Intelligence — Invest + Price History Design

**Date:** 2026-05-26
**Status:** Draft — awaiting review
**Scope:** Phase 1 (shared infrastructure) + Phase 2 (Invest feature).
Deals (Phase 3) and Copy/UX polish (Phase 4) are documented at the end as
follow-on work with their own future specs.

## 1. Why

The app currently answers one question — "what's the EV of opening this
container?" — which is a commodity. This work repositions it as **CS2
container intelligence**: alongside open-EV, surface **price trends and
hold value** (this spec) and later **cross-market deals** (Phase 3).

New top-level nav: `Cases · Invest · Deals · Compare · Method`
(Deals ships in Phase 3.)

## 2. Phase 1 — Shared infrastructure

### 2.1 Vercel KV replaces the JSON cache

`lib/cache/db.ts` currently persists to `data/cache.json`. We swap the
backend to [`@vercel/kv`](https://vercel.com/docs/storage/vercel-kv) while
keeping the exact same exported function surface
(`getRow / setRow / deleteByName / getAllRows / setSourceDown /
getSourceDown / maxFetchedAt / flush / closeDb / keyFor`). Nothing
downstream (`priceCache.ts`, aggregator, EV service) changes.

**Dual-mode backend:**

```ts
// lib/cache/db.ts
const useKv = !!process.env.KV_REST_API_URL;
```

- `useKv === true` (production / preview on Vercel): read/write via `@vercel/kv`.
- `useKv === false` (local dev, CI, tests): keep the existing JSON-file store
  unchanged. This preserves the current test suite (`tests/cache.test.ts`
  wipes `data/cache.json` between runs — that path stays valid in dev mode).

**KV key scheme:**

| Key | Value | Notes |
|-----|-------|-------|
| `price:<source>:<market_hash_name>` | `{ lowestPrice, medianPrice, quantity, fetchedAt }` | live price cache (30-min TTL via stored `fetchedAt`) |
| `srcdown:<source>` | unix-ms `down_until` | source-health flag |
| `hist:<market_hash_name>` | `[{ d: "YYYY-MM-DD", p: number, v: number }]` | daily price history (see 2.2) |

KV calls are async; the current `db.ts` API is sync. We make the internal
helpers async and `await` them in `priceCache.ts` (which is already called
from async aggregator code). The sync JSON path wraps its result in
`Promise.resolve` so both backends share one async signature.

> Migration note: `priceCache.ts` functions become `async`. Callers in
> `aggregator.ts` already run inside `async` functions and currently call
> these synchronously; they gain `await`. `tests/cache.test.ts` becomes
> `async` per assertion. This is the one breaking-signature change and is
> contained to the cache layer + its direct callers.

### 2.2 Steam price-history pipeline

Steam exposes per-item historical median price + volume at:

```
GET https://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=<name>
Cookie: steamLoginSecure=<token>
```

Returns `{ success, prices: [["Mon DD YYYY HH: +0", median, "volume"], ...] }`
spanning the item's whole listing lifetime (hourly recent, daily older).

**Auth:** requires a logged-in `steamLoginSecure` cookie. Stored as the
Vercel env var `STEAM_LOGIN_SECURE`. **Never committed, never logged.** The
cookie expires roughly every 1–2 weeks; when history fetches start returning
`success: false`, the cron marks Steam-history as stale and the dashboard
shows a "history auth expired — refresh cookie" admin pill. Refreshing =
pasting a new cookie into the Vercel dashboard.

**Backfill script — `scripts/backfill-history.ts`:**

- Iterates every unique `market_hash_name` across all containers
  (reuses `namesForCase`).
- For each, calls `pricehistory`, downsamples to **one point per day**
  (last median of each calendar day), trims to the last **365 days**, writes
  `hist:<name>` to KV.
- Rate-limited (concurrency 1, ~1.5 s gap) and **resumable**: it records a
  cursor (`hist:_cursor`) so a re-run continues where it stopped after a
  ban/timeout. Designed to run over multiple sessions.
- Skips names already backfilled within the last 7 days.

**Daily snapshot — `app/api/cron/snapshot/route.ts`:**

- Vercel Cron (configured in `vercel.json`, `schedule: "0 6 * * *"`).
- For each item, appends today's aggregated `bestPrice` (+ Skinport volume)
  to its `hist:` series and trims to 365 days. This keeps history current
  without re-hitting Steam, so the Steam cookie is only needed for the
  initial deep backfill, not daily operation.
- Protected by a `CRON_SECRET` bearer check (Vercel sets this automatically).

### 2.3 History access layer — `lib/history/`

- `lib/history/types.ts` — `HistoryPoint = { d: string; p: number; v: number }`,
  `PriceHistory = HistoryPoint[]`.
- `lib/history/store.ts` — `getHistory(name)`, `getHistories(names[])`,
  `appendPoint(name, point)`. Backed by KV in prod, by an in-repo
  `data/history.sample.json` fixture in dev so the Invest UI is demoable
  offline.
- `lib/history/metrics.ts` — pure functions over a `PriceHistory`:
  - `appreciation(history, days)` → % change over the window.
  - `volatility(history)` → stdev of daily returns.
  - `volumeTrend(history, days)` → slope of daily volume (for the
    "frozen supply" heuristic).
  - `frozenSupplyScore(history)` → high when price rises while volume falls.

These are unit-tested with synthetic series (no network).

## 3. Phase 2 — Invest feature

### 3.1 Container-level investment metrics

For each container we derive (from the history of the **container itself**,
i.e. `hist:<caseMarketHashName>`):

```ts
type InvestMetrics = {
  caseId: string;
  currentPrice: number | null;
  change30d: number | null;   // %
  change90d: number | null;   // %
  change365d: number | null;  // %
  volatility: number | null;
  frozenSupply: boolean;       // frozenSupplyScore over threshold
  history: HistoryPoint[];     // trimmed for sparkline
};
```

Computed in `lib/invest/service.ts`, combining `loadCases()` metadata,
the live aggregated price, and `lib/history`.

### 3.2 `/invest` page

- Ranked table/grid of containers by **change90d** (default), re-sortable by
  30d / 365d / volatility / current price.
- Each row: case image, name, current price, 30/90/365-day change (green/red),
  a **sparkline** (Recharts `<Line>` mini-chart), and a `FROZEN SUPPLY` badge
  when flagged.
- Kind filter reused from the dashboard.
- Honest header: appreciation ≠ guaranteed; past performance caveat.

### 3.3 Sparklines on existing cards + detail chart

- `components/Sparkline.tsx` — tiny inline SVG/Recharts line, no axes.
  Added to `CaseCard` (dashboard) showing 90-day container price.
- `components/PriceChart.tsx` — full chart (price + volume) on the case
  detail page, above the tier breakdown.

### 3.4 Verdict chip (lightweight, ships here)

`components/VerdictChip.tsx` — derives SELL / HOLD / RISKY-OPEN from
open-EV% + 90-day appreciation:

- `HOLD` — appreciation positive and outpacing the per-open EV loss.
- `RISKY-OPEN` — high lottery score (σ/μ) and deeply negative EV.
- `SELL` — flat/declining price and negative open-EV.

Rule lives in `lib/invest/verdict.ts` (pure, unit-tested). Shown on the
dashboard cards and the Invest rows.

## 4. Data flow

```
Backfill (one-off, manual w/ Steam cookie) ─┐
Daily Cron snapshot ────────────────────────┼─► KV: hist:<name>
Live aggregator (existing) ─────────────────┴─► KV: price:<source>:<name>

/invest  → invest/service → loadCases + aggregate + history/store → InvestMetrics → page
/case/id → existing EV   + history/store(caseName) → PriceChart
/        → existing summaries + history sparkline + VerdictChip
```

## 5. Files

```
lib/cache/db.ts                 → dual KV / JSON backend (async)
lib/cache/priceCache.ts         → async signatures
lib/history/types.ts            new
lib/history/store.ts            new (KV-backed, JSON fixture in dev)
lib/history/metrics.ts          new (pure)
lib/invest/service.ts           new
lib/invest/verdict.ts           new (pure)
app/invest/page.tsx             new
app/api/cron/snapshot/route.ts  new
scripts/backfill-history.ts     new
components/Sparkline.tsx        new
components/PriceChart.tsx       new
components/VerdictChip.tsx      new
components/CaseCard.tsx         + sparkline + verdict
app/layout.tsx                  + "Invest" nav link
vercel.json                     + cron schedule
data/history.sample.json        new (dev fixture, committed)
package.json                    + @vercel/kv
tests/history-metrics.test.ts   new
tests/verdict.test.ts           new
```

## 6. Error handling

- **No KV configured locally** → JSON-file cache + `history.sample.json`
  fixture; everything renders with sample trends.
- **Steam cookie expired** → backfill/snapshot skip Steam-history, log a
  warning, surface a "history auth expired" admin pill. Existing live prices
  unaffected.
- **Item has no history yet** → sparkline + changes render as "—"; the
  Invest row sorts to the bottom. No crash.
- **KV rate/credit limit hit** → fall back to live-only (no history) and
  show a soft banner.

## 7. Testing

- `lib/history/metrics.ts` — synthetic series: known appreciation %, flat
  series → 0, rising-price-falling-volume → frozenSupply true.
- `lib/invest/verdict.ts` — table of (evPct, appreciation, lottery) →
  expected verdict.
- KV layer: dev-mode JSON path keeps the existing `tests/cache.test.ts`
  green; KV path is integration-tested manually against a real KV (not in CI).
- Component smoke: `<Sparkline>` renders with/without data; `<VerdictChip>`
  shows the right label.

## 8. Out of scope (this spec)

- **Phase 3 — Deals / arbitrage.** Cross-market spread feed, warm-cache cron
  for the top ~300–500 liquid items, fee-adjusted resale, trade-hold flags.
  Own spec later; depends only on Phase 1 infra.
- **Phase 4 — Copy/UX polish.** Hero rewrite, summary bar, EV%/cost range
  filters. Independent; can ship anytime.
- Inventory import, alerts, accounts.

## 9. Risks / assumptions

- **Steam cookie is sensitive and expiring.** Mitigated: env-var only, never
  logged/committed, daily snapshot avoids needing it after initial backfill.
- **Backfill is slow** (~6k items, rate-limited) → expect it to run over
  several sessions; resumable cursor makes that safe.
- **"Frozen supply" is a heuristic**, not an official Valve signal — labelled
  as an estimate in the UI.
- **KV free-tier limits** (~30k commands/mo) — we batch reads and cache
  aggressively; the daily cron is the main writer.
- **Appreciation is descriptive, not predictive** — UI carries a clear
  "not investment advice" caveat.
