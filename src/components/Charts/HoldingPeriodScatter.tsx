"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PropertyWithMetrics } from "@/lib/types";

interface Props {
  properties: PropertyWithMetrics[];
}

interface DataPoint {
  yearsHeld: number;
  totalReturn: number;
  address: string;
}

export default function HoldingPeriodScatter({ properties }: Props) {
  const data: DataPoint[] = properties
    .filter(
      (p) =>
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.years_held !== null &&
        p.years_held > 0 &&
        p.total_return_pct !== null
    )
    .map((p) => ({
      yearsHeld: p.years_held!,
      totalReturn: p.total_return_pct!,
      address: p.address,
    }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          type="number"
          dataKey="yearsHeld"
          name="Years Held"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
          label={{
            value: "Years Held",
            position: "insideBottom",
            offset: -5,
            fill: "#64748b",
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="totalReturn"
          name="Total Return"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
          tickFormatter={(val: number) => `${val}%`}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as DataPoint;
            return (
              <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 font-semibold text-white">{d.address}</p>
                <p className="text-slate-300">
                  Held: {d.yearsHeld.toFixed(1)} years
                </p>
                <p className="text-teal-400">Return: {d.totalReturn}%</p>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#14b8a6" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
