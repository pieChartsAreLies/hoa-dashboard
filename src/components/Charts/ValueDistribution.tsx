"use client";

import {
  BarChart,
  Bar,
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

interface BinData {
  range: string;
  count: number;
  rangeStart: number;
}

function buildHistogram(properties: PropertyWithMetrics[]): BinData[] {
  const values = properties
    .filter((p) => p.current_value !== null && p.current_value > 0)
    .map((p) => p.current_value!);

  if (values.length === 0) return [];

  const min = Math.floor(Math.min(...values) / 100000) * 100000;
  const max = Math.ceil(Math.max(...values) / 100000) * 100000;
  const binSize = 100000;

  const bins: BinData[] = [];
  for (let start = min; start < max; start += binSize) {
    const end = start + binSize;
    const count = values.filter((v) => v >= start && v < end).length;
    const startLabel = `$${(start / 1000).toFixed(0)}K`;
    const endLabel = `$${(end / 1000).toFixed(0)}K`;
    bins.push({
      range: `${startLabel}-${endLabel}`,
      count,
      rangeStart: start,
    });
  }

  return bins;
}

export default function ValueDistribution({ properties }: Props) {
  const data = buildHistogram(properties);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="range"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          stroke="#475569"
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(20, 184, 166, 0.1)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as BinData;
            return (
              <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                <p className="font-semibold text-white">{d.range}</p>
                <p className="text-teal-400">
                  {d.count} {d.count === 1 ? "property" : "properties"}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
