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
import fs from "node:fs";
import path from "node:path";

beforeEach(() => {
  // Wipe the JSON store between tests so each test starts clean.
  closeDb();
  const p = path.join(process.cwd(), "data", "cache.json");
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

describe("priceCache", () => {
  it("returns a fresh row within TTL and null after expiry", () => {
    const now = Date.now();
    setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 5, medianPrice: 6, fetchedAt: now },
    ]);
    expect(getCachedQuote("A", "steam", now + 60_000)?.lowestPrice).toBe(5);
    expect(getCachedQuote("A", "steam", now + PRICE_TTL_MS + 1_000)).toBeNull();
  });

  it("upserts existing rows", () => {
    const t = Date.now();
    setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 5, medianPrice: 6, fetchedAt: t },
    ]);
    setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 7, medianPrice: 8, fetchedAt: t + 100 },
    ]);
    const q = getCachedQuote("A", "steam", t + 100);
    expect(q?.lowestPrice).toBe(7);
    expect(q?.fetchedAt).toBe(t + 100);
  });

  it("invalidate() deletes specified names across all sources", () => {
    const t = Date.now();
    setCachedQuotes([
      { marketHashName: "A", source: "steam", lowestPrice: 1, medianPrice: null, fetchedAt: t },
      { marketHashName: "A", source: "csfloat", lowestPrice: 2, medianPrice: null, fetchedAt: t },
      { marketHashName: "B", source: "steam", lowestPrice: 3, medianPrice: null, fetchedAt: t },
    ]);
    invalidate(["A"]);
    expect(getCachedQuote("A", "steam", t)).toBeNull();
    expect(getCachedQuote("A", "csfloat", t)).toBeNull();
    expect(getCachedQuote("B", "steam", t)?.lowestPrice).toBe(3);
  });

  it("source-down flag flips for 10 minutes", () => {
    const now = Date.now();
    expect(isSourceDown("steam", now)).toBe(false);
    markSourceDown("steam", now);
    expect(isSourceDown("steam", now + 5 * 60_000)).toBe(true);
    expect(isSourceDown("steam", now + 11 * 60_000)).toBe(false);
  });
});

afterAll(() => {
  closeDb();
});
