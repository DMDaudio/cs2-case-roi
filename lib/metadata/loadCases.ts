import fs from "node:fs";
import path from "node:path";
import type { CaseMeta, CasesFile } from "./types";

let cached: CasesFile | null = null;

export function loadCasesFile(): CasesFile {
  if (cached) return cached;
  const p = path.resolve(process.cwd(), "data", "cases.json");
  const raw = fs.readFileSync(p, "utf8");
  cached = JSON.parse(raw) as CasesFile;
  return cached;
}

export function loadCases(): CaseMeta[] {
  return loadCasesFile().cases;
}

export function loadCaseById(id: string): CaseMeta | null {
  return loadCases().find((c) => c.id === id) ?? null;
}

/** Useful for tests. */
export function clearCachedCases() {
  cached = null;
}
