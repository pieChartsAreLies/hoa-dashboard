"use client";

import { useEffect, useMemo, useState } from "react";
import type { PropertyWithMetrics } from "@/lib/types";
import { calculateEquity } from "@/lib/amortization";
import { monthsElapsed, annualizedReturn } from "@/lib/metrics";
import LeaderboardSelector, {
  PRESETS,
  type PresetKey,
} from "@/components/LeaderboardTable/LeaderboardSelector";
import LeaderboardTable, {
  type LeaderboardRow,
} from "@/components/LeaderboardTable/LeaderboardTable";

interface FlipRecord {
  pcn: string;
  buy_price: number;
  buy_date: string;
  sell_price: number;
  sell_date: string;
  flip_return_pct: number;
}

export default function LeaderboardsPage() {
  const [properties, setProperties] = useState<PropertyWithMetrics[]>([]);
  const [flips, setFlips] = useState<FlipRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey>("best_investment");
  const [sortField, setSortField] = useState("annualized_return_pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch properties and flips on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [propRes, flipsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/flips"),
        ]);
        if (!propRes.ok) throw new Error(`API error: ${propRes.status}`);
        const [propData, flipsData] = await Promise.all([
          propRes.json(),
          flipsRes.json(),
        ]);
        setProperties(propData as PropertyWithMetrics[]);
        setFlips(flipsData as FlipRecord[]);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build flip lookup: pcn -> best flip_return_pct
  const flipMap = useMemo(() => {
    const map = new globalThis.Map<string, number>();
    for (const flip of flips) {
      const existing = map.get(flip.pcn);
      if (existing === undefined || flip.flip_return_pct > existing) {
        map.set(flip.pcn, flip.flip_return_pct);
      }
    }
    return map;
  }, [flips]);

  const flipPcns = useMemo(() => new Set(flipMap.keys()), [flipMap]);

  // Build leaderboard rows with client-side calculations
  const rows: LeaderboardRow[] = useMemo(() => {
    return properties.map((p) => {
      const hasMetrics =
        p.purchase_price !== null &&
        p.purchase_price > 1000 &&
        p.current_value !== null &&
        p.current_value > 0;

      // Annualized return
      let annReturn: number | null = null;
      if (hasMetrics && p.years_held && p.years_held > 0) {
        annReturn = annualizedReturn(
          p.purchase_price as number,
          p.current_value as number,
          p.years_held
        );
      }

      // Equity calculation
      let equity: number | null = null;
      let leverageReturn: number | null = null;
      if (
        hasMetrics &&
        p.purchase_date &&
        p.current_value
      ) {
        const months = monthsElapsed(p.purchase_date);
        if (months > 0) {
          const rate = p.rate_at_purchase ?? 6.0;
          const result = calculateEquity({
            purchasePrice: p.purchase_price as number,
            downPaymentPct: 0.2,
            annualRate: rate,
            termYears: 30,
            monthsElapsed: months,
            currentMarketValue: p.current_value,
          });
          equity = result.estimatedEquity;
          leverageReturn = result.leverageReturn;
        }
      }

      return {
        pcn: p.pcn,
        address: p.address,
        purchase_price: p.purchase_price,
        current_value: p.current_value,
        total_return_pct: p.total_return_pct,
        annualized_return_pct: annReturn,
        total_gain_dollars: p.total_gain_dollars,
        price_per_sqft_current: p.price_per_sqft_current,
        price_per_sqft_purchase: p.price_per_sqft_purchase,
        estimated_equity: equity,
        leverage_return: leverageReturn,
        purchase_date: p.purchase_date,
        flip_return_pct: flipMap.get(p.pcn) ?? null,
        isFlip: flipPcns.has(p.pcn),
        hasMetrics,
      };
    });
  }, [properties, flipMap, flipPcns]);

  // For "Best Flips" preset, filter to only flip properties
  const displayRows = useMemo(() => {
    if (activePreset === "best_flips") {
      return rows.filter((r) => r.isFlip);
    }
    return rows;
  }, [rows, activePreset]);

  // When a preset is selected, apply its sort
  function handlePresetChange(key: PresetKey) {
    setActivePreset(key);
    const preset = PRESETS.find((p) => p.key === key);
    if (preset) {
      setSortField(preset.sortField);
      setSortDir(preset.sortDir);
    }
  }

  // When a column header is clicked, clear the active preset visual
  function handleSortChange(field: string, dir: "asc" | "desc") {
    setSortField(field);
    setSortDir(dir);
    // Check if this matches any preset
    const matching = PRESETS.find(
      (p) => p.sortField === field && p.sortDir === dir
    );
    setActivePreset(matching?.key ?? activePreset);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">Loading leaderboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-teal-500/20 px-4 py-2 text-sm text-teal-400 transition-colors hover:bg-teal-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metricsCount = displayRows.filter((r) => r.hasMetrics).length;
  const flipCount = flipPcns.size;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Leaderboards</h1>
          <p className="mt-1 text-sm text-slate-400">
            {activePreset === "best_flips"
              ? `${metricsCount} flip-flagged properties`
              : `${metricsCount} properties ranked`}
            {activePreset !== "best_flips" &&
              rows.length - rows.filter((r) => r.hasMetrics).length > 0 &&
              ` (${rows.length - rows.filter((r) => r.hasMetrics).length} without valid purchase data)`}
            {flipCount > 0 && activePreset !== "best_flips" && (
              <span className="ml-2 text-amber-400">
                {flipCount} flips detected
              </span>
            )}
          </p>
        </div>

        {/* Preset Selector */}
        <div className="mb-5">
          <LeaderboardSelector
            selected={activePreset}
            onChange={handlePresetChange}
          />
        </div>

        {/* Table */}
        <LeaderboardTable
          rows={displayRows}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
