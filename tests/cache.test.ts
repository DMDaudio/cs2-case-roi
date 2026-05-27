import { describe, expect, it, beforeEach, afterAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cs2caseroi-cache-"));
process.chdir(tmpRoot);
fs.mkdirSync(path.join(tmpRoot, "data"), { recursive: true });

import {
  getCachedQuote,
  setCachedQuotes,
  invalidate,
  PRICE_TTL_MS,
  markSourceDown,
  isSourceDown,
} from "@/lib/cache/priceCache";
import { closeDb } from "@/lib/cache/db";

beforeEach(() => {
  // Wipe the JSON store between tests so each test starts clean.
  closeDb();
  const p = path.join(process.cwd(), "data", "cache.json");
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

describe("priceCache", () => {
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
});

afterAll(() => {
  closeDb();
});
