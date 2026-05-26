import { NextResponse } from "next/server";
import { getCaseDetail } from "@/lib/ev/service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const data = await getCaseDetail(id);
    if (!data.case) {
      return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/cases/[id]] error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
