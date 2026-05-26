"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CaseSummary } from "@/lib/ev/service";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";

export function CompareControls({ all }: { all: CaseSummary[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = useMemo(() => {
    return (params.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [params]);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((c) => (q ? c.caseName.toLowerCase().includes(q) : true))
      .filter((c) => !selected.includes(c.caseId))
      .slice(0, 8);
  }, [all, query, selected]);

  function update(ids: string[]) {
    const next = ids.slice(0, 4).join(",");
    router.push(next ? `/compare?ids=${encodeURIComponent(next)}` : "/compare");
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-sm text-ink-faint">
            Pick up to 4 cases to compare.
          </span>
        ) : (
          selected.map((id) => {
            const c = all.find((x) => x.caseId === id);
            return (
              <span
                key={id}
                className="chip border-accent-orange/40 bg-accent-orange/10 text-accent-orange"
              >
                {c?.caseName ?? id}
                <button
                  onClick={() => update(selected.filter((x) => x !== id))}
                  className="ml-1 rounded hover:bg-accent-orange/20"
                  aria-label={`remove ${c?.caseName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
      </div>

      {selected.length < 4 && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a case…"
            className={cn(
              "w-full rounded-lg border border-bg-border bg-bg-raised px-3 py-2 text-sm",
              "placeholder:text-ink-faint focus:border-accent-orange/40 focus:outline-none"
            )}
          />
          {query && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filtered.length === 0 ? (
                <span className="text-xs text-ink-faint">No matches.</span>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.caseId}
                    onClick={() => update([...selected, c.caseId])}
                    className="chip hover:border-accent-orange/40 hover:text-accent-orange"
                  >
                    <Plus className="h-3 w-3" />
                    {c.caseName}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
