"use client";

import { useMemo, useState } from "react";
import type { CaseSummary } from "@/lib/ev/service";
import { CaseCard } from "./CaseCard";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type SortKey = "ev_pct" | "ev_net" | "cost" | "lottery" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  ev_pct: "EV %",
  ev_net: "Net EV $",
  cost: "Cost / open",
  lottery: "Risk (σ/μ)",
  name: "Name (A–Z)",
};

export function CaseGrid({ cases }: { cases: CaseSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("ev_pct");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? cases.filter((c) => c.caseName.toLowerCase().includes(q))
      : [...cases];

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
      }
    });

    return list;
  }, [cases, query, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
            onChange={(e) => setSort(e.target.value as SortKey)}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c, i) => (
            <CaseCard key={c.caseId} data={c} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
