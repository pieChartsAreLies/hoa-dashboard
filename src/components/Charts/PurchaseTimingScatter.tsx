"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
}

export default function PurchaseTimingScatter({ properties }: Props) {
  const data: DataPoint[] = properties
    .filter(
      (p) =>
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.purchase_date !== null &&
        p.total_return_pct !== null &&
        p.living_sqft !== null &&
        p.living_sqft > 0
    )
    .map((p) => ({
      timestamp: new Date(p.purchase_date!).getTime(),
      totalReturn: p.total_return_pct!,
      sqft: p.living_sqft!,
      address: p.address,
      purchaseDate: p.purchase_date!,
      purchasePrice: p.purchase_price!,
      rateAtPurchase: p.rate_at_purchase,
    }));

  const minYear = Math.min(...data.map((d) => d.timestamp));
  const maxYear = Math.max(...data.map((d) => d.timestamp));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
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
        />
        <YAxis
          type="number"
          dataKey="totalReturn"
          name="Total Return"
          unit="%"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
          tickFormatter={(val: number) => `${val}%`}
        />
        <ZAxis
          type="number"
          dataKey="sqft"
          range={[40, 200]}
          name="Living Sqft"
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
                  Purchased: {formatDate(d.purchaseDate)}
                </p>
                <p className="text-slate-300">
                  Price: {formatCurrency(d.purchasePrice)}
                </p>
                <p className="text-teal-400">Return: {d.totalReturn}%</p>
                {d.rateAtPurchase && (
                  <p className="text-slate-300">
                    Rate: {d.rateAtPurchase.toFixed(2)}%
                  </p>
                )}
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#14b8a6" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
