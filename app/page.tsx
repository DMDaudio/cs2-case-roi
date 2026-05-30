import { getAllCaseSummaries } from "@/lib/ev/service";
import { CaseGrid } from "@/components/CaseGrid";
import { RefreshButton } from "@/components/RefreshButton";
import { relativeTime } from "@/lib/utils";
import type { SourceName } from "@/lib/prices/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata = {
  title: "Dashboard",
  description: "Every CS2 container ranked by unboxing ROI. Live multi-source pricing.",
};

export default async function HomePage() {
  const { cases, sourceStatus, lastRefreshAt } = await getAllCaseSummaries();

  const okCount = (["steam", "csfloat", "skinport"] as SourceName[]).filter(
    (s) => sourceStatus[s] === "ok"
  ).length;

  return (
    <div className="space-y-8">
      <section className="panel-elevated relative overflow-hidden p-8">
        <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
              counter-strike 2 · container roi
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              The honest expected return of every container
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-ink-dim">
              Weapon cases, sticker capsules, autograph capsules, and souvenir packs —
              each priced from <span className="text-ink">Steam</span>,{" "}
              <span className="text-ink">CSFloat</span>, and{" "}
              <span className="text-ink">Skinport</span> against Valve's published drop odds for
              that kind. Wear-averaged and StatTrak-blended where it applies.
              <span className="ml-1 text-warn">Almost everything loses money on average.</span>
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {(["steam", "csfloat", "skinport"] as SourceName[]).map((s) => (
                <span
                  key={s}
                  className={
                    "chip " +
                    (sourceStatus[s] === "down"
                      ? "border-bad/40 text-bad"
                      : "border-good/30 text-good/90")
                  }
                >
                  {s} · {sourceStatus[s]}
                </span>
              ))}
            </div>
            <div className="text-xs text-ink-faint">
              {lastRefreshAt
                ? `Last refresh ${relativeTime(lastRefreshAt)} · ${okCount}/3 sources`
                : "No price data yet — click refresh"}
            </div>
            <RefreshButton />
          </div>
        </div>
      </section>

      <CaseGrid cases={cases} />
    </div>
  );
}
