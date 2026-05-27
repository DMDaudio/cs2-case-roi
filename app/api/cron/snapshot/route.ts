import { NextResponse } from "next/server";
import { loadCases } from "@/lib/metadata/loadCases";
import { aggregate } from "@/lib/prices/aggregator";
import { appendPoint } from "@/lib/history/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron sends a bearer token = process.env.CRON_SECRET
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cases = loadCases();
  const names = cases.map((c) => c.caseMarketHashName);
  const agg = await aggregate(names, { sources: ["skinport"], bypassCache: true });

  const today = new Date().toISOString().slice(0, 10);
  let written = 0;
  for (const name of names) {
    const p = agg.prices.get(name);
    if (p?.bestPrice != null) {
      await appendPoint(name, { d: today, p: p.bestPrice, v: p.quantity ?? 0 });
      written++;
    }
  }
  return NextResponse.json({ ok: true, date: today, written });
}
