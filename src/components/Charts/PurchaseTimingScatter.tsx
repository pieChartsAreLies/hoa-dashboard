"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
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
  totalReturn: number;
  sqft: number;
  address: string;
  purchaseDate: string;
  purchasePrice: number;
  rateAtPurchase: number | null;
  rateColor: string;
  rateLabel: string;
}

interface RateLinePoint {
  timestamp: number;
  rate: number;
}

function getRateColor(rate: number | null): { color: string; label: string } {
  if (rate === null) return { color: "#64748b", label: "Unknown" };
  if (rate < 4) return { color: "#22c55e", label: "Low (<4%)" };
  if (rate < 6) return { color: "#14b8a6", label: "Medium (4-6%)" };
  if (rate < 8) return { color: "#f59e0b", label: "High (6-8%)" };
  return { color: "#ef4444", label: "Very High (>8%)" };
}

const RATE_LEGEND = [
  { color: "#22c55e", label: "Low (<4%)" },
  { color: "#14b8a6", label: "Medium (4-6%)" },
  { color: "#f59e0b", label: "High (6-8%)" },
  { color: "#ef4444", label: "Very High (>8%)" },
];

export default function PurchaseTimingScatter({ properties }: Props) {
  const { scatterGroups, rateLineData, minYear, maxYear } = useMemo(() => {
    const allData: DataPoint[] = properties
      .filter(
        (p) =>
          p.purchase_price !== null &&
          p.purchase_price > 1000 &&
          p.purchase_date !== null &&
          p.total_return_pct !== null &&
          p.living_sqft !== null &&
          p.living_sqft > 0
      )
      .map((p) => {
        const { color, label } = getRateColor(p.rate_at_purchase);
        return {
          timestamp: new Date(p.purchase_date!).getTime(),
          totalReturn: p.total_return_pct!,
          sqft: p.living_sqft!,
          address: p.address,
          purchaseDate: p.purchase_date!,
          purchasePrice: p.purchase_price!,
          rateAtPurchase: p.rate_at_purchase,
          rateColor: color,
          rateLabel: label,
        };
      });

    // Group by rate bucket for colored scatter rendering
    const groups: Record<string, DataPoint[]> = {};
    for (const d of allData) {
      const key = d.rateColor;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }

    // Build rate line from actual purchase-date rates, sorted by time
    const ratePoints: RateLinePoint[] = allData
      .filter((d) => d.rateAtPurchase !== null)
      .map((d) => ({
        timestamp: d.timestamp,
        rate: d.rateAtPurchase!,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Dedupe by averaging rates at similar timestamps (within same month)
    const deduped: RateLinePoint[] = [];
    for (const pt of ratePoints) {
      const monthKey = new Date(pt.timestamp).toISOString().slice(0, 7);
      const last = deduped[deduped.length - 1];
      if (
        last &&
        new Date(last.timestamp).toISOString().slice(0, 7) === monthKey
      ) {
        last.rate = (last.rate + pt.rate) / 2;
      } else {
        deduped.push({ ...pt });
      }
    }

    const timestamps = allData.map((d) => d.timestamp);
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);

    return {
      scatterGroups: groups,
      rateLineData: deduped,
      minYear: min,
      maxYear: max,
    };
  }, [properties]);

  // Combine rate line data with scatter for ComposedChart
  // ComposedChart needs a single data array for the Line, scatter uses its own data
  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart
          margin={{ top: 10, right: 50, bottom: 10, left: 10 }}
          data={rateLineData}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="timestamp"
            name="Purchase Date"
            domain={[minYear, maxYear]}
            tickFormatter={(val: number) =>
              new Date(val).getFullYear().toString()
            }
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
            allowDuplicatedCategory={false}
          />
          <YAxis
            yAxisId="return"
            type="number"
            name="Total Return"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
            tickFormatter={(val: number) => `${val}%`}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            type="number"
            name="30yr Rate"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            stroke="#475569"
            tickFormatter={(val: number) => `${val}%`}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <ZAxis type="number" dataKey="sqft" range={[40, 200]} name="Sqft" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              // Find the scatter payload (has address)
              const scatterPayload = payload.find(
                (p) =>
                  p.payload &&
                  "address" in p.payload &&
                  p.payload.address !== undefined
              );
              if (scatterPayload) {
                const d = scatterPayload.payload as DataPoint;
                return (
                  <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-semibold text-white">{d.address}</p>
                    <p className="text-slate-300">
                      Purchased: {formatDate(d.purchaseDate)}
                    </p>
                    <p className="text-slate-300">
                      Price: {formatCurrency(d.purchasePrice)}
                    </p>
                    <p className="text-teal-400">
                      Return: {d.totalReturn.toFixed(1)}%
                    </p>
                    {d.rateAtPurchase !== null && (
                      <p className="text-amber-300">
                        Rate: {d.rateAtPurchase.toFixed(2)}%
                      </p>
                    )}
                  </div>
                );
              }
              // Rate line tooltip
              const linePayload = payload.find(
                (p) => p.dataKey === "rate"
              );
              if (linePayload) {
                const d = linePayload.payload as RateLinePoint;
                return (
                  <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                    <p className="text-slate-300">
                      {new Date(d.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-amber-300">
                      30yr Rate: {d.rate.toFixed(2)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Rate line overlay on secondary axis */}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="rate"
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="30yr Rate"
            connectNulls
          />

          {/* Scatter groups by rate color */}
          {RATE_LEGEND.map((bucket) => {
            const points = scatterGroups[bucket.color];
            if (!points || points.length === 0) return null;
            return (
              <Scatter
                key={bucket.color}
                yAxisId="return"
                data={points}
                fill={bucket.color}
                fillOpacity={0.75}
                name={bucket.label}
                dataKey="totalReturn"
              />
            );
          })}

          {/* Unknown rate group */}
          {scatterGroups["#64748b"] &&
            scatterGroups["#64748b"].length > 0 && (
              <Scatter
                yAxisId="return"
                data={scatterGroups["#64748b"]}
                fill="#64748b"
                fillOpacity={0.5}
                name="Unknown Rate"
                dataKey="totalReturn"
              />
            )}

          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            formatter={(value: string) => (
              <span className="text-slate-400">{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
