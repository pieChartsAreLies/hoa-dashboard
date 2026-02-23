"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { PropertyWithMetrics } from "@/lib/types";

interface Props {
  properties: PropertyWithMetrics[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface DataPoint {
  timestamp: number;
  purchasePrice: number;
  address: string;
  purchaseDate: string;
}

interface TrendPoint {
  timestamp: number;
  trend: number;
}

function calculateTrend(data: DataPoint[]): TrendPoint[] {
  if (data.length < 2) return [];

  // Simple linear regression
  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.timestamp, 0);
  const sumY = data.reduce((s, d) => s + d.purchasePrice, 0);
  const sumXY = data.reduce((s, d) => s + d.timestamp * d.purchasePrice, 0);
  const sumX2 = data.reduce((s, d) => s + d.timestamp * d.timestamp, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const minT = sorted[0].timestamp;
  const maxT = sorted[sorted.length - 1].timestamp;

  // Generate 20 evenly spaced trend points
  const points: TrendPoint[] = [];
  const step = (maxT - minT) / 19;
  for (let i = 0; i < 20; i++) {
    const t = minT + step * i;
    points.push({ timestamp: t, trend: slope * t + intercept });
  }
  return points;
}

export default function AppreciationCurve({ properties }: Props) {
  const scatterData: DataPoint[] = properties
    .filter(
      (p) =>
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.purchase_date !== null
    )
    .map((p) => ({
      timestamp: new Date(p.purchase_date!).getTime(),
      purchasePrice: p.purchase_price!,
      address: p.address,
      purchaseDate: p.purchase_date!,
    }));

  const trendData = calculateTrend(scatterData);

  // Merge scatter + trend data for ComposedChart
  const allTimestamps = [
    ...scatterData.map((d) => d.timestamp),
    ...trendData.map((d) => d.timestamp),
  ];
  const minT = Math.min(...allTimestamps);
  const maxT = Math.max(...allTimestamps);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          type="number"
          dataKey="timestamp"
          domain={[minT, maxT]}
          tickFormatter={(val: number) =>
            new Date(val).getFullYear().toString()
          }
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
        />
        <YAxis
          type="number"
          tickFormatter={(val: number) =>
            `$${(val / 1000).toFixed(0)}K`
          }
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            // Find the scatter payload (has address)
            const scatterPayload = payload.find(
              (p) => p.payload?.address
            );
            if (!scatterPayload) return null;
            const d = scatterPayload.payload as DataPoint;
            return (
              <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 font-semibold text-white">{d.address}</p>
                <p className="text-slate-300">
                  Purchased: {formatDate(d.purchaseDate)}
                </p>
                <p className="text-teal-400">
                  Price: {formatCurrency(d.purchasePrice)}
                </p>
              </div>
            );
          }}
        />
        <Line
          data={trendData}
          type="linear"
          dataKey="trend"
          stroke="#14b8a6"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          legendType="none"
        />
        <Scatter
          data={scatterData}
          dataKey="purchasePrice"
          fill="#14b8a6"
          fillOpacity={0.7}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
