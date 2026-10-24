"use client";

import type { CommunityStats } from "@/lib/types";
import { formatCurrency, formatPct, formatNumber } from "@/lib/metrics";

interface CommunityStatsBarProps {
  stats: CommunityStats | null;
}

export default function CommunityStatsBar({ stats }: CommunityStatsBarProps) {
  if (!stats) return null;

  const items = [
    { label: "Properties", value: formatNumber(stats.total_properties) },
    { label: "Avg Est. Value", value: formatCurrency(stats.avg_market_value) },
    { label: "Avg Return", value: formatPct(stats.avg_return_pct) },
    { label: "Avg $/sqft", value: `$${formatNumber(stats.avg_price_per_sqft)}` },
    {
      label: "Community Value",
      value: formatCurrency(stats.total_community_value),
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="border-t border-white/10 bg-slate-950/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
