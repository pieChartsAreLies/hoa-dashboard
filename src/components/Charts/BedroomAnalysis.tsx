"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { PropertyWithMetrics } from "@/lib/types";
import { formatCurrency } from "@/lib/metrics";

interface Props {
  properties: PropertyWithMetrics[];
}

interface BedroomData {
  label: string;
  count: number;
  avgValue: number;
  avgPricePerSqft: number | null;
  avgReturnPct: number | null;
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function buildGroups(properties: PropertyWithMetrics[]): BedroomData[] {
  const groups = new Map<number, PropertyWithMetrics[]>();
  for (const p of properties) {
    if (p.bedrooms === null || !p.current_value) continue;
    const list = groups.get(p.bedrooms) ?? [];
    list.push(p);
    groups.set(p.bedrooms, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([beds, list]) => ({
      label: `${beds} bd`,
      count: list.length,
      avgValue: avg(list.map((p) => p.current_value!)) ?? 0,
      avgPricePerSqft: avg(
        list.filter((p) => p.price_per_sqft_current !== null).map((p) => p.price_per_sqft_current!)
      ),
      avgReturnPct: avg(
        list.filter((p) => p.total_return_pct !== null).map((p) => p.total_return_pct!)
      ),
    }));
}

export default function BedroomAnalysis({ properties }: Props) {
  const data = buildGroups(properties);
  const known = data.reduce((n, d) => n + d.count, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 24, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} stroke="#475569" />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            cursor={{ fill: "rgba(20, 184, 166, 0.1)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as BedroomData;
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-white">
                    {d.label} ({d.count} {d.count === 1 ? "home" : "homes"})
                  </p>
                  <p className="text-teal-400">Avg est. value: {formatCurrency(d.avgValue)}</p>
                  {d.avgPricePerSqft !== null && (
                    <p className="text-slate-300">Avg $/sqft: ${d.avgPricePerSqft.toFixed(0)}</p>
                  )}
                  {d.avgReturnPct !== null && (
                    <p className="text-slate-300">Avg return: {d.avgReturnPct.toFixed(0)}%</p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="avgValue" fill="#14b8a6" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              fill="#94a3b8"
              fontSize={11}
              formatter={(v) => `n=${v}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-slate-500">
        Bedroom counts from Redfin for {known} of {properties.length} homes; the rest have no
        public listing record.
      </p>
    </div>
  );
}
