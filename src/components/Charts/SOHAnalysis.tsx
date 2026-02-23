"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PropertyWithMetrics } from "@/lib/types";

interface Props {
  properties: PropertyWithMetrics[];
}

const MILL_RATE = 0.019;
const TOP_N = 20;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function truncateAddress(address: string, maxLen = 18): string {
  if (address.length <= maxLen) return address;
  return address.substring(0, maxLen - 1) + "...";
}

interface SOHDataPoint {
  address: string;
  fullAddress: string;
  assessed_value: number;
  market_value: number;
  gap: number;
  taxSavings: number;
}

interface SOHStats {
  avgGap: number;
  avgTaxSavings: number;
  homesteadCount: number;
  largestGapAddress: string;
  largestGapAmount: number;
  largestGapTaxIncrease: number;
}

function useSOHData(properties: PropertyWithMetrics[]) {
  return useMemo(() => {
    const homesteaded = properties.filter(
      (p) =>
        p.homestead === 1 &&
        p.assessed_value !== null &&
        p.assessed_value > 0 &&
        p.market_value !== null &&
        p.market_value > 0
    );

    const withGap: SOHDataPoint[] = homesteaded
      .map((p) => {
        const gap = p.market_value! - p.assessed_value!;
        return {
          address: truncateAddress(p.address),
          fullAddress: p.address,
          assessed_value: p.assessed_value!,
          market_value: p.market_value!,
          gap,
          taxSavings: gap * MILL_RATE,
        };
      })
      .filter((d) => d.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    const chartData = withGap.slice(0, TOP_N);

    const totalGap = withGap.reduce((sum, d) => sum + d.gap, 0);
    const avgGap = withGap.length > 0 ? totalGap / withGap.length : 0;
    const avgTaxSavings = avgGap * MILL_RATE;
    const largest = withGap[0] || null;

    const stats: SOHStats = {
      avgGap,
      avgTaxSavings,
      homesteadCount: homesteaded.length,
      largestGapAddress: largest?.fullAddress ?? "N/A",
      largestGapAmount: largest?.gap ?? 0,
      largestGapTaxIncrease: (largest?.gap ?? 0) * MILL_RATE,
    };

    return { chartData, stats };
  }, [properties]);
}

export default function SOHAnalysis({ properties }: Props) {
  const { chartData, stats } = useSOHData(properties);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center text-sm text-slate-500">
        No homesteaded properties with SOH gap data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Homesteaded Properties</p>
          <p className="mt-1 text-lg font-bold text-white">
            {stats.homesteadCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Average SOH Gap</p>
          <p className="mt-1 text-lg font-bold text-teal-400">
            {formatCurrency(stats.avgGap)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Est. Annual Tax Savings</p>
          <p className="mt-1 text-lg font-bold text-green-400">
            {formatCurrency(stats.avgTaxSavings)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            avg gap x 19 mill rate
          </p>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">Largest Gap</p>
          <p className="mt-1 text-lg font-bold text-amber-400">
            {formatCurrency(stats.largestGapAmount)}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-500">
            {stats.largestGapAddress}
          </p>
        </div>
      </div>

      {/* Callout */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-200">
          If the top SOH beneficiary sold, the new buyer&apos;s annual property
          taxes would increase by approximately{" "}
          <span className="font-bold text-amber-400">
            {formatCurrency(stats.largestGapTaxIncrease)}
          </span>
        </p>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 80, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="address"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            stroke="#475569"
            angle={-45}
            textAnchor="end"
            height={90}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
            tickFormatter={(val: number) => formatCompact(val)}
          />
          <Tooltip
            cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as SOHDataPoint;
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1.5 font-semibold text-white">
                    {d.fullAddress}
                  </p>
                  <p className="text-teal-400">
                    Assessed: {formatCurrency(d.assessed_value)}
                  </p>
                  <p className="text-amber-400">
                    Market: {formatCurrency(d.market_value)}
                  </p>
                  <p className="mt-1 border-t border-slate-700 pt-1 text-white">
                    SOH Gap: {formatCurrency(d.gap)}
                  </p>
                  <p className="text-green-400">
                    Annual Tax Savings: {formatCurrency(d.taxSavings)}
                  </p>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) => (
              <span className="text-slate-300">{value}</span>
            )}
          />
          <Bar
            dataKey="assessed_value"
            name="Assessed Value"
            fill="#14b8a6"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="market_value"
            name="Market Value"
            fill="#f59e0b"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-center text-[10px] text-slate-500">
        Top {chartData.length} homesteaded properties by SOH gap (market value
        minus assessed value), sorted descending
      </p>
    </div>
  );
}
