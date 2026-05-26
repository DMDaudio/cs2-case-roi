# CS2 Case ROI

Live statistical expected-return dashboard for every Counter-Strike 2 weapon case.

Multiplies Valve's official drop odds by real-time market prices (Steam Market +
CSFloat + Skinport, aggregated to the lowest live ask), averaged across wears
and blended with the 10% StatTrak roll, to show what you'd actually get back
per opened case. Almost every case is deeply negative — the dashboard is
honest about that.

## Features

- **Ranked dashboard** of every case by EV %, sortable by net EV, cost, risk, or name.
- **Case detail view** with per-rarity-tier breakdown and per-skin price + contribution to EV.
- **Side-by-side comparison** for up to 4 cases (EV, σ, σ/μ lottery score, rarity-tier averages).
- **Three price sources** aggregated: the lowest live ask wins.
- **30-min SQLite price cache** + manual "Refresh prices" button + optional cron-warmable.
- **Methodology page** documents every assumption and formula.

## Setup

```bash
npm install
npm run fetch-metadata   # optional — replaces the seed data/cases.json with the full ByMykel dump
npm run dev              # http://localhost:3000
```

The repo ships with a small seeded `data/cases.json` (5 cases) so the app works
out-of-the-box. Run `npm run fetch-metadata` once to pull every CS2 case from
[ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API).

## Scripts

| Command                  | What it does                                          |
|--------------------------|-------------------------------------------------------|
| `npm run dev`            | Next.js dev server with HMR                           |
| `npm run build`          | Production build                                      |
| `npm run start`          | Run the production build                              |
| `npm run fetch-metadata` | Refresh `data/cases.json` from ByMykel/CSGO-API       |
| `npm run warm-cache`     | Pre-fetch prices for the top-50 cases (cron-friendly) |
| `npm test`               | Run the Vitest suite                                  |

## Architecture

```
app/                     Next.js App Router pages + route handlers
  api/
    cases/               GET all case summaries
    cases/[id]/          GET one case with full breakdown
    compare/             GET ?ids=a,b,c,d
    refresh/             POST invalidate cache + re-fetch
components/              UI: CaseCard, CaseGrid, CaseDetailView, CompareTable, …
lib/
  metadata/              CaseMeta types + JSON loader
  prices/                steam.ts, csfloat.ts, skinport.ts + aggregator.ts
  cache/                 better-sqlite3 30-min TTL cache
  ev/                    odds, calculator, variance, service
data/
  cases.json             committed metadata snapshot
  cache.db               gitignored — created at first run
scripts/
  fetch-metadata.ts      pulls ByMykel
  warm-cache.ts          cron-style pre-fetch
tests/                   Vitest unit tests (ev / aggregator / cache)
```

See `docs/superpowers/specs/2026-05-25-cs2-case-roi-design.md` for the full
design spec, including the exact EV math and known approximations.

## Caveats

- Wear distribution is approximated as uniform across listed wears. Real Valve
  distribution is float-uniform within each skin's allowed range.
- Steam Market's 15% seller fee is not deducted; `bestPrice` already prefers
  the lowest live ask across all three sources.
- When all three sources fail for a skin, it's treated as $0 and the case is
  flagged with a "lower-bound EV" warning.
- **Not financial advice.** Cases are entertainment. Don't open them as an investment.

## License

MIT.
