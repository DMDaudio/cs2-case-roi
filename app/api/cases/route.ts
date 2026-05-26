import { NextResponse } from "next/server";
import { getAllCaseSummaries } from "@/lib/ev/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllCaseSummaries();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/cases] error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
