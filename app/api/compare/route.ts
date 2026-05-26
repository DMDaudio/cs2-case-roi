import { NextResponse } from "next/server";
import { getCaseDetail } from "@/lib/ev/service";
import type { CaseEV } from "@/lib/ev/calculator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (ids.length === 0) {
    return NextResponse.json({ error: "no_ids" }, { status: 400 });
  }

  const cases: CaseEV[] = [];
  for (const id of ids) {
    const r = await getCaseDetail(id);
    if (r.case) cases.push(r.case);
  }
  return NextResponse.json({ cases });
}
