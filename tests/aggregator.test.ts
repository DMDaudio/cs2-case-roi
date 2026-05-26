import { describe, expect, it, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Force the cache DB to live in a temp dir per test run.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cs2caseroi-"));
process.chdir(tmpRoot);
fs.mkdirSync(path.join(tmpRoot, "data"), { recursive: true });

import { aggregate } from "@/lib/prices/aggregator";
import { steamSource } from "@/lib/prices/steam";
import { skinportSource } from "@/lib/prices/skinport";
import { csfloatSource } from "@/lib/prices/csfloat";
import { closeDb } from "@/lib/cache/db";

beforeEach(() => {
  // Stub each source so no real network happens.
  steamSource.fetch = async (names) =>
    names.map((n) => ({
      marketHashName: n,
      source: "steam" as const,
      lowestPrice: 10,
      medianPrice: 11,
      fetchedAt: Date.now(),
    }));
  skinportSource.fetch = async (names) =>
    names.map((n) => ({
      marketHashName: n,
      source: "skinport" as const,
      lowestPrice: 8,
      medianPrice: null,
      fetchedAt: Date.now(),
    }));
  csfloatSource.fetch = async (names) =>
    names.map((n) => ({
      marketHashName: n,
      source: "csfloat" as const,
      lowestPrice: null, // missing
      medianPrice: null,
      fetchedAt: Date.now(),
    }));
});

describe("aggregate", () => {
  it("picks the min across sources, ignoring nulls", async () => {
    const r = await aggregate(["X"], { bypassCache: true });
    const p = r.prices.get("X")!;
    expect(p.bestPrice).toBe(8); // skinport wins
    expect(p.sources.find((s) => s.name === "csfloat")?.price).toBeNull();
    expect(p.sources).toHaveLength(3);
  });

  it("returns null bestPrice when every source returns null", async () => {
    steamSource.fetch = async (names) =>
      names.map((n) => ({ marketHashName: n, source: "steam" as const, lowestPrice: null, medianPrice: null, fetchedAt: 0 }));
    skinportSource.fetch = async (names) =>
      names.map((n) => ({ marketHashName: n, source: "skinport" as const, lowestPrice: null, medianPrice: null, fetchedAt: 0 }));
    csfloatSource.fetch = async (names) =>
      names.map((n) => ({ marketHashName: n, source: "csfloat" as const, lowestPrice: null, medianPrice: null, fetchedAt: 0 }));
    const r = await aggregate(["Y"], { bypassCache: true });
    expect(r.prices.get("Y")!.bestPrice).toBeNull();
  });

  it("respects sources filter", async () => {
    const r = await aggregate(["Z"], { bypassCache: true, sources: ["steam"] });
    const p = r.prices.get("Z")!;
    expect(p.bestPrice).toBe(10);
    expect(r.sourceStatus.csfloat).toBe("skipped");
    expect(r.sourceStatus.skinport).toBe("skipped");
  });
});

// Ensure DB connection is closed after suite so the temp dir can be cleaned up.
import { afterAll } from "vitest";
afterAll(() => {
  closeDb();
});
