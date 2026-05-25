# CS2 Case ROI Dashboard — Design

**Date:** 2026-05-25
**Status:** Draft — awaiting approval

## 1. Purpose

A web app that ranks every CS2 weapon case by its **statistical expected return**
(EV), computed from real-time market prices for every skin in the case, the
official Valve drop odds, and the cost of a key + the case itself. The user can:

- See all cases ranked by EV % (and net $ EV per open).
- Search/filter to find a specific case.
- Open a case detail view to inspect every skin, its market price (across
  multiple sources), and how much it contributes to the EV.
- Pick 2–4 cases and compare them side-by-side.

The aesthetic mimics CS2 itself: dark UI, orange/cyan accents, rarity-colored
borders, monospaced numeric typography.

## 2. Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + lucide-react icons
- **DB / cache:** `better-sqlite3` (single file `data/cache.db`)
- **Data fetching:** native `fetch` in Next.js Route Handlers
- **Charts:** Recharts (for EV breakdown bars + comparison radar)
- **Deploy target:** Vercel (with a fallback to `next start` on a local Node)

## 3. Data sources

### 3.1 Static metadata — ByMykel/CSGO-API

[github.com/ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API) publishes
versioned JSON dumps of every case, the items it contains, rarity tier, and
image URLs. We download it once at build time via `scripts/fetch-metadata.ts`
into `data/cases.json`. Re-run manually when Valve releases a new case.

Schema (after our normalization):

```ts
type CaseMeta = {
  id: string;                  // "operation_bravo_case"
  name: string;                // "Operation Bravo Case"
  imageUrl: string;
  releaseDate: string;
  requiresKey: boolean;        // false for souvenir-style; true for all weapon cases
  keyMarketHashName: string;   // "Operation Bravo Case Key"
  contents: CaseItem[];
  rareSpecial: CaseItem[];     // knives / gloves
};

type CaseItem = {
  marketHashName: string;      // "AK-47 | Case Hardened (Field-Tested)" -- expanded per wear
  baseName: string;            // "AK-47 | Case Hardened"
  rarity: "mil_spec" | "restricted" | "classified" | "covert" | "rare_special";
  availableWears: Wear[];      // which Factory New / Field-Tested / etc. exist
  statTrakAvailable: boolean;
  imageUrl: string;
};
```

### 3.2 Live prices — three sources, aggregated

Three fetchers behind one interface:

```ts
interface PriceSource {
  name: "steam" | "csfloat" | "skinport";
  fetch(marketHashNames: string[]): Promise<PriceQuote[]>;
}

type PriceQuote = {
  marketHashName: string;
  source: string;
  lowestPrice: number | null;   // USD
  medianPrice: number | null;
  fetchedAt: number;            // unix ms
};
```

- **Steam Market** — `steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=...`. One-by-one only, rate ~20 req/min. We batch with concurrency = 2 and exponential backoff.
- **Skinport** — `api.skinport.com/v1/items?app_id=730&currency=USD`. Returns the whole catalog in one call → easiest source.
- **CSFloat** — public listings endpoint, filtered to lowest price per `market_hash_name`.

A `PriceAggregator` merges per item:

```ts
type AggregatedPrice = {
  marketHashName: string;
  bestPrice: number;            // min across sources (the realistic resale)
  medianAcrossSources: number;
  sources: { name: string; price: number | null }[];
};
```

`bestPrice` is what the EV calculator uses (this is what you'd realistically
sell the skin for after fees — the lowest live ask is the best proxy).

### 3.3 Cache

SQLite table `price_cache`:

```sql
CREATE TABLE price_cache (
  market_hash_name TEXT NOT NULL,
  source           TEXT NOT NULL,
  lowest_price     REAL,
  median_price     REAL,
  fetched_at       INTEGER NOT NULL,
  PRIMARY KEY (market_hash_name, source)
);
CREATE INDEX idx_fetched_at ON price_cache(fetched_at);
```

- TTL = 30 minutes.
- A `RefreshButton` in the UI POSTs `/api/refresh?caseId=...` to invalidate and
  re-fetch only the items in that case.
- A cron-style background refresh runs every 25 min for the top-50 cases by
  popularity so the home page is always warm. Implemented as a Vercel Cron
  (or `node-cron` in local dev).

## 4. EV calculation

### 4.1 Official Valve drop odds

| Tier         | Probability |
|--------------|-------------|
| Mil-Spec     | 79.92%      |
| Restricted   | 15.98%      |
| Classified   | 3.20%       |
| Covert       | 0.64%       |
| Rare Special | 0.26%       |

Within a tier, every skin is equally likely. StatTrak: each unboxed skin has a
**10%** chance of being StatTrak, and StatTrak versions sell for roughly 1.4×
the normal price (we use a per-skin StatTrak premium when one is listed,
otherwise the 1.4× heuristic).

### 4.2 Per-skin expected price

For a skin `s` with available wears `W_s = [w1, w2, …]`:

```
price_normal(s)    = mean over w in W_s of bestPrice(s, w)
price_stattrak(s)  = bestPrice("StatTrak™ " + s) if listed, else 1.4 * price_normal(s)
price_expected(s)  = 0.9 * price_normal(s) + 0.1 * price_stattrak(s)
```

Wears are averaged (equal weight) because Valve's wear-distribution within an
unboxing is uniform inside the skin's allowed float range — but the actual
range varies per skin, so for v1 we approximate with simple equal weighting
across listed wears. Listed as a known approximation in the README.

### 4.3 Case EV

```
EV_tier(t)  = mean over s in tier_t of price_expected(s)
EV_gross    = Σ over tiers t of P(t) * EV_tier(t)
EV_net      = EV_gross − bestPrice(case) − bestPrice(key)
EV_pct      = EV_net / (bestPrice(case) + bestPrice(key))
```

`EV_pct` of `-0.65` means "on average you lose 65% of your spend per open."
Almost every case is deeply negative — the dashboard is honest about that.

### 4.4 Variance (for the comparison view)

```
Var_gross = Σ_t P(t) * (EV_tier(t)^2 + Var_tier(t)) − EV_gross^2
StDev     = sqrt(Var_gross)
```

Reported as a "lottery score" badge — high σ/EV means the case is dominated by
rare knife drops; low σ/EV means consistent small returns.

## 5. UI / routes

### 5.1 Pages

| Route              | Component                | Purpose |
|--------------------|--------------------------|---------|
| `/`                | `<Dashboard />`          | Ranked grid of all cases. Search bar, sort dropdown (EV%, EV$, variance, release date), tier filter pills. |
| `/case/[id]`       | `<CaseDetail />`         | Hero with case image + key cost + EV summary. Table of every skin with rarity color, wear-avg price, StatTrak price, contribution to EV. Source badges (Steam / CSFloat / Skinport) next to each price. |
| `/compare?ids=a,b` | `<CompareView />`        | Up to 4 cases side-by-side: EV%, net EV, σ, knife pool value, "best item" highlight, radar chart. |
| `/about`           | `<About />`              | Methodology, data sources, "this is not financial advice." |

### 5.2 Visual language

- Background: near-black `#0e0f12` with subtle noise texture.
- Accent: CS2 orange `#de9b35` for CTAs, cyan `#5e98d9` for links.
- Rarity colors match in-game: mil-spec `#4b69ff`, restricted `#8847ff`,
  classified `#d32ce6`, covert `#eb4b4b`, rare special `#ffd700`.
- Numeric typography: `JetBrains Mono`. Prices are right-aligned, with the
  USD symbol dimmed.
- Subtle animation: the case card tilts on hover, rarity border glows.

### 5.3 Header

`CS2 CASE ROI · live prices from Steam · CSFloat · Skinport · last refreshed 2m ago`

with a manual "Refresh now" button (rate-limited to one click per minute).

## 6. File layout

```
CSCaseROI/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  → <Dashboard />
│   ├── case/[id]/page.tsx        → <CaseDetail />
│   ├── compare/page.tsx          → <CompareView />
│   ├── about/page.tsx
│   └── api/
│       ├── cases/route.ts        GET all cases + EV
│       ├── cases/[id]/route.ts   GET one case with full breakdown
│       ├── compare/route.ts      GET ?ids=a,b,c,d
│       └── refresh/route.ts      POST invalidate cache for a case
├── lib/
│   ├── ev/
│   │   ├── calculator.ts         EV math (pure, easily testable)
│   │   ├── variance.ts
│   │   └── odds.ts               Valve drop tier constants
│   ├── prices/
│   │   ├── types.ts              PriceSource, PriceQuote, AggregatedPrice
│   │   ├── steam.ts
│   │   ├── csfloat.ts
│   │   ├── skinport.ts
│   │   └── aggregator.ts
│   ├── cache/
│   │   ├── db.ts                 better-sqlite3 connection
│   │   └── priceCache.ts         get/set with 30-min TTL
│   └── metadata/
│       └── loadCases.ts          reads data/cases.json
├── components/
│   ├── CaseCard.tsx
│   ├── CaseGrid.tsx
│   ├── EVBadge.tsx
│   ├── RarityBar.tsx
│   ├── PriceCell.tsx             shows price + source badges
│   ├── RefreshButton.tsx
│   ├── CompareTable.tsx
│   └── ui/                       shadcn primitives
├── data/
│   ├── cases.json                generated, committed
│   └── cache.db                  gitignored
├── scripts/
│   ├── fetch-metadata.ts         pulls + normalizes ByMykel data
│   └── warm-cache.ts             prefetch top-50 cases (called by cron)
├── tests/
│   ├── ev.test.ts                math correctness
│   ├── aggregator.test.ts        source merging
│   └── cache.test.ts             TTL behaviour
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## 7. Error handling

- **Source down:** if Steam returns 429 / 5xx, we mark that source as
  unavailable for 10 min and continue with the remaining sources. The UI shows
  a small "Steam offline" pill in the header instead of failing the page.
- **Skin not priced anywhere:** treated as `price = 0` and the tier EV is
  computed with a note ("3 of 17 skins unpriced — EV is a lower bound"). User
  sees a small warning icon on the case card.
- **Stale cache:** we serve stale data with a "stale, refreshing…" badge while
  a background revalidation runs.
- **Bad route param:** `/case/[id]` returns Next's `notFound()` 404 page,
  styled to match.

## 8. Testing

- `lib/ev/calculator.ts` is pure functions — covered by Vitest unit tests for:
  - Known cases with hand-computed EV (e.g. a synthetic case with 2 skins per
    tier, fixed prices → assert exact EV).
  - StatTrak weighting.
  - Wear averaging with missing wears.
- `lib/prices/aggregator.ts` — verify min-price selection with mocked sources,
  fallback when a source returns null, source order independence.
- `lib/cache/priceCache.ts` — verify 30-min TTL, that an expired entry triggers
  refetch, that writes update existing rows.
- Component smoke tests with React Testing Library: `<CaseCard />` shows
  expected EV; `<CompareTable />` renders all selected cases.

## 9. Out of scope (v1)

- Sticker capsules, souvenir packages, autograph capsules — only standard
  weapon cases.
- Currencies other than USD.
- Account login / saving favourite cases.
- Trade-up calculator.
- Float-distribution-weighted wear pricing (we use simple wear-average).
- Historical EV charts.

These are explicit deferrals — easy to add later without restructuring.

## 10. Open assumptions (called out for user)

- Wear distribution within a tier is approximated as uniform across listed
  wears. Real Valve distribution is float-uniform within each skin's range,
  which we'd need per-skin float caps to model exactly.
- The 10% StatTrak chance is well-documented; the 1.4× premium fallback is a
  rough average — when both StatTrak and non-StatTrak are listed we use the
  real ratio.
- `bestPrice = min across sources` assumes you'd actually sell at the lowest
  live ask, net of fees. Steam's 15% fee is **not** subtracted because most
  third-party markets (CSFloat, Skinport) take much less. The README notes
  this and the user can mentally apply a fee adjustment.
