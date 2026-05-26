"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshButton({ caseId }: { caseId?: string }) {
  const [busy, setBusy] = useState(false);
  const [_, startTransition] = useTransition();
  const router = useRouter();

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const url = caseId ? `/api/refresh?caseId=${encodeURIComponent(caseId)}` : "/api/refresh";
      await fetch(url, { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      // small min-display so the user sees the spin
      setTimeout(() => setBusy(false), 600);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-bg-border bg-bg-raised px-3 py-1.5 text-xs",
        "hover:border-accent-orange/40 hover:text-accent-orange",
        "disabled:cursor-wait disabled:opacity-60"
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      {busy ? "Refreshing…" : "Refresh prices"}
    </button>
  );
}
