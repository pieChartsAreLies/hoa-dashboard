"use client";

import { useMemo } from "react";
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
import type { EquitySettings } from "@/components/EquityCalculator/EquityPanel";
import { calculateEquity } from "@/lib/amortization";
import { monthsElapsed } from "@/lib/metrics";

interface Props {
  properties: PropertyWithMetrics[];
  settings: EquitySettings;
}

interface BinData {
  range: string;
  count: number;
  rangeStart: number;
}

const DEFAULT_RATE = 6.5;
const BIN_SIZE = 100_000;

function computeEquityValues(
  properties: PropertyWithMetrics[],
  settings: EquitySettings
): number[] {
  return properties
    .filter(
      (p) =>
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.purchase_date !== null &&
        p.market_value !== null &&
        p.market_value > 0
    )
    .map((p) => {
      const rate =
        settings.rateMode === "custom"
          ? settings.customRate
          : p.rate_at_purchase ?? DEFAULT_RATE;

      const result = calculateEquity({
        purchasePrice: p.purchase_price!,
        downPaymentPct: settings.downPaymentPct / 100,
        annualRate: rate,
        termYears: settings.termYears,
        monthsElapsed: monthsElapsed(p.purchase_date!),
        currentMarketValue: p.market_value!,
      });

      return result.estimatedEquity;
    })
    .filter((eq) => eq > 0);
}

function buildBins(values: number[]): BinData[] {
  if (values.length === 0) return [];

  const min = Math.floor(Math.min(...values) / BIN_SIZE) * BIN_SIZE;
  const max = Math.ceil(Math.max(...values) / BIN_SIZE) * BIN_SIZE;

  const bins: BinData[] = [];
  for (let start = min; start < max; start += BIN_SIZE) {
    const end = start + BIN_SIZE;
    const count = values.filter((v) => v >= start && v < end).length;

    const fmt = (n: number) => {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      return `$${(n / 1000).toFixed(0)}K`;
    };

    bins.push({
      range: `${fmt(start)}-${fmt(end)}`,
      count,
      rangeStart: start,
    });
  }

  return bins;
}

export default function EquityDistribution({ properties, settings }: Props) {
  const data = useMemo(() => {
    const values = computeEquityValues(properties, settings);
    return buildBins(values);
  }, [properties, settings]);

  if (data.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center text-sm text-slate-500">
        No equity data available for the current settings.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
      >
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
