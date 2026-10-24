"use client";

import type { PropertyWithMetrics } from "@/lib/types";
import type { MetricKey } from "./metrics";
import { METRICS } from "./metrics";
import { formatCurrency } from "@/lib/metrics";

interface PropertyTooltipProps {
  property: PropertyWithMetrics;
  metricValue: number | null;
  metricKey: MetricKey;
  x: number;
  y: number;
}

export default function PropertyTooltip({
  property,
  metricValue,
  metricKey,
  x,
  y,
}: PropertyTooltipProps) {
  const metricConfig = METRICS.find((m) => m.key === metricKey);
  const formattedMetric = metricConfig ? metricConfig.format(metricValue) : "N/A";

  // Position the tooltip offset from cursor, clamping to not overflow right edge
  const style: React.CSSProperties = {
    position: "absolute",
    left: x + 16,
    top: y - 12,
    pointerEvents: "none" as const,
    zIndex: 20,
  };

  return (
    <div style={style}>
      <div className="min-w-[220px] rounded-lg border border-white/10 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold text-white truncate">
          {property.address}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{metricConfig?.label ?? "Metric"}</span>
            <span className="font-medium text-teal-400">{formattedMetric}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Purchase Price</span>
            <span className="text-slate-200">
              {property.purchase_price
                ? formatCurrency(property.purchase_price)
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Est. Market Value</span>
            <span className="text-slate-200">
              {formatCurrency(property.current_value)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Beds / Baths</span>
            <span className="text-slate-200">
              {property.bedrooms ?? "?"} bd / {property.bathrooms ?? "?"} ba
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Purchase Date</span>
            <span className="text-slate-200">
              {property.purchase_date ?? "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
