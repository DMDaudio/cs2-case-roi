import type { Verdict } from "@/lib/invest/verdict";
import { VERDICT_LABEL } from "@/lib/invest/verdict";
import { cn } from "@/lib/utils";

const STYLE: Record<Verdict, string> = {
  HOLD: "border-good/40 bg-good/10 text-good",
  RISKY_OPEN: "border-warn/40 bg-warn/10 text-warn",
  SELL: "border-bad/40 bg-bad/10 text-bad",
};

export function VerdictChip({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        STYLE[verdict],
        className
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
