"use client";

import { useMemo, useState } from "react";
import type { CaseSummary } from "@/lib/ev/service";
import { CaseCard } from "./CaseCard";
import { cn } from "@/lib/utils";
import { Search, ChevronDown } from "lucide-react";
import type { CaseKind } from "@/lib/metadata/types";

type SortKey = "ev_pct" | "ev_net" | "cost" | "lottery" | "name" | "newest";
const PAGE_SIZE = 24;

const KIND_TABS: { key: "all" | CaseKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "weapon_case", label: "Weapon Cases" },
  { key: "sticker_capsule", label: "Sticker Capsules" },
  { key: "souvenir_package", label: "Souvenir Packs" },
  { key: "autograph_capsule", label: "Autograph Capsules" },
];

const SORT_LABELS: Record<SortKey, string> = {
  ev_pct: "EV %",
  ev_net: "Net EV $",
  cost: "Cost / open",
  lottery: "Risk (σ/μ)",
  name: "Name (A–Z)",
  newest: "Newest first",
};

export function CaseGrid({ cases }: { cases: CaseSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("ev_pct");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [kind, setKind] = useState<"all" | CaseKind>("all");

  const countsByKind = useMemo(() => {
    const map = new Map<string, number>([["all", cases.length]]);
    for (const c of cases) map.set(c.caseKind, (map.get(c.caseKind) ?? 0) + 1);
    return map;
  }, [cases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? cases.filter((c) => c.caseName.toLowerCase().includes(q))
      : [...cases];
    if (kind !== "all") list = list.filter((c) => c.caseKind === kind);

    list.sort((a, b) => {
      switch (sort) {
        case "ev_pct":
          return (b.evPct ?? -Infinity) - (a.evPct ?? -Infinity);
        case "ev_net":
          return (b.evNet ?? -Infinity) - (a.evNet ?? -Infinity);
        case "cost":
          return (a.totalCostPerOpen ?? Infinity) - (b.totalCostPerOpen ?? Infinity);
        case "lottery":
          return (a.lotteryScore ?? Infinity) - (b.lotteryScore ?? Infinity);
        case "name":
          return a.caseName.localeCompare(b.caseName);
        case "newest":
          // Cases come from the fetcher already sorted newest-first.
          return 0;
      }
    });

    return list;
  }, [cases, query, sort, kind]);

  const visible = filtered.slice(0, shown);
  const hasMore = shown < filtered.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {KIND_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setKind(tab.key); setShown(PAGE_SIZE); }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors",
              kind === tab.key
                ? "border-accent-orange/50 bg-accent-orange/15 text-accent-orange"
                : "border-bg-border bg-bg-raised text-ink-dim hover:border-bg-border hover:text-ink"
            )}
          >
            {tab.label}
            <span className="num ml-1.5 text-ink-faint">
              {countsByKind.get(tab.key) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }}
            placeholder="Search cases…"
            className={cn(
              "w-full rounded-lg border border-bg-border bg-bg-raised px-9 py-2 text-sm",
              "placeholder:text-ink-faint focus:border-accent-orange/40 focus:outline-none"
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Sort</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setShown(PAGE_SIZE); }}
            className="rounded-lg border border-bg-border bg-bg-raised px-3 py-2 text-sm focus:border-accent-orange/40 focus:outline-none"
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="panel p-10 text-center text-ink-dim">No cases match "{query}".</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((c, i) => (
              <CaseCard key={c.caseId} data={c} rank={i + 1} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-ink-faint">
            <span>
              Showing <span className="num text-ink-dim">{visible.length}</span> of{" "}
              <span className="num text-ink-dim">{filtered.length}</span> cases
            </span>
            {hasMore && (
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-bg-border bg-bg-raised px-4 py-2 text-sm",
                  "hover:border-accent-orange/40 hover:text-accent-orange"
                )}
              >
                Load more
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
