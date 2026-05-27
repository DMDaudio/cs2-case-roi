import { getAllCaseSummaries, getCaseDetail } from "@/lib/ev/service";
import { CompareControls } from "@/components/CompareControls";
import { CompareTable } from "@/components/CompareTable";
import type { CaseEV } from "@/lib/ev/calculator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const sp = await searchParams;
  const ids = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const all = await getAllCaseSummaries();
  const selected: CaseEV[] = [];
  for (const id of ids) {
    const r = await getCaseDetail(id);
    if (r.case) selected.push(r.case);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
          side-by-side
        </div>
        <h1 className="mt-1 text-3xl font-bold text-ink">Compare cases</h1>
        <p className="mt-1 text-sm text-ink-dim">
          See which case is the least bad — EV %, volatility, and rarity-tier price
          breakdown for up to four cases at once.
        </p>
      </div>

      <CompareControls all={all.cases} />
      <CompareTable cases={selected} />
    </div>
  );
}
