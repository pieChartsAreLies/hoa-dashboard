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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface DataPoint {
  timestamp: number;
  pricePerSqft: number;
  address: string;
  purchaseDate: string;
  livingSqft: number;
}

export default function PricePerSqftTrend({ properties }: Props) {
  const data: DataPoint[] = properties
    .filter(
      (p) =>
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.purchase_date !== null &&
        p.price_per_sqft_purchase !== null &&
        p.living_sqft !== null &&
        p.living_sqft > 0
    )
    .map((p) => ({
      timestamp: new Date(p.purchase_date!).getTime(),
      pricePerSqft: p.price_per_sqft_purchase!,
      address: p.address,
      purchaseDate: p.purchase_date!,
      livingSqft: p.living_sqft!,
    }));

  const timestamps = data.map((d) => d.timestamp);
  const minT = Math.min(...timestamps);
  const maxT = Math.max(...timestamps);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          type="number"
          dataKey="timestamp"
          name="Purchase Date"
          domain={[minT, maxT]}
          tickFormatter={(val: number) =>
            new Date(val).getFullYear().toString()
          }
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
        />
        <YAxis
          type="number"
          dataKey="pricePerSqft"
          name="$/sqft"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          stroke="#475569"
          tickFormatter={(val: number) => `$${val}`}
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
                <p className="text-blue-400">
                  ${d.pricePerSqft.toFixed(2)}/sqft
                </p>
                <p className="text-slate-300">
                  {d.livingSqft.toLocaleString()} sqft
                </p>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#3b82f6" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
