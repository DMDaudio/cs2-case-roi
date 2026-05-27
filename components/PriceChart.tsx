"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HistoryPoint } from "@/lib/history/types";
import { formatUSD } from "@/lib/utils";

export function PriceChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="panel p-6 text-center text-sm text-ink-faint">
        No price history yet for this container.
      </div>
    );
  }
  return (
    <div className="panel p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
        Price history
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#262932" vertical={false} />
          <XAxis dataKey="d" tick={{ fill: "#5a6070", fontSize: 10 }} minTickGap={40} />
          <YAxis
            tick={{ fill: "#5a6070", fontSize: 10 }}
            width={48}
            tickFormatter={(v) => formatUSD(v)}
          />
          <Tooltip
            contentStyle={{ background: "#15171c", border: "1px solid #262932", borderRadius: 8 }}
            labelStyle={{ color: "#9aa0ad" }}
            formatter={(v: number) => [formatUSD(v), "price"]}
          />
          <Line type="monotone" dataKey="p" stroke="#de9b35" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
