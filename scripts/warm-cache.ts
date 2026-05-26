/**
 * Pre-fetches prices for the top-N cases so the home page is always
 * served warm. Intended to be called by Vercel Cron (or local
 * `node-cron`) every ~25 minutes.
 */
import { loadCases } from "../lib/metadata/loadCases";
import { aggregate } from "../lib/prices/aggregator";
import { namesForCase } from "../lib/ev/calculator";

async function main() {
  const cases = loadCases().slice(0, 50);
  const names = new Set<string>();
  for (const c of cases) for (const n of namesForCase(c)) names.add(n);
  console.log(`Warming cache for ${cases.length} cases / ${names.size} market names…`);
  const t0 = Date.now();
  await aggregate(Array.from(names));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
