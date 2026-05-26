import { NextResponse } from "next/server";
import { invalidate } from "@/lib/cache/priceCache";
import { loadCaseById, loadCases } from "@/lib/metadata/loadCases";
import { namesForCase } from "@/lib/ev/calculator";
import { getAllCaseSummaries, getCaseDetail } from "@/lib/ev/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId");

  if (caseId) {
    const c = loadCaseById(caseId);
    if (!c) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    invalidate(namesForCase(c));
    const data = await getCaseDetail(caseId, { bypassCache: true });
    return NextResponse.json(data);
  }

  // Otherwise: refresh everything (used by the cron / "refresh all" button)
  const everyName = new Set<string>();
  for (const c of loadCases()) for (const n of namesForCase(c)) everyName.add(n);
  invalidate(Array.from(everyName));
  const data = await getAllCaseSummaries({ bypassCache: true });
  return NextResponse.json(data);
}
