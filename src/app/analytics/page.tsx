"use client";

import { useEffect, useState } from "react";
import type { PropertyWithMetrics } from "@/lib/types";
import PurchaseTimingScatter from "@/components/Charts/PurchaseTimingScatter";
import ValueDistribution from "@/components/Charts/ValueDistribution";
import AppreciationCurve from "@/components/Charts/AppreciationCurve";
import PricePerSqftTrend from "@/components/Charts/PricePerSqftTrend";
import HoldingPeriodScatter from "@/components/Charts/HoldingPeriodScatter";
import BedroomAnalysis from "@/components/Charts/BedroomAnalysis";

interface ChartCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800 p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mb-4 mt-1 text-xs text-slate-400">{description}</p>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [properties, setProperties] = useState<PropertyWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setProperties(data as PropertyWithMetrics[]);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">
            Loading analytics data...
          </p>
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

  const validCount = properties.filter(
    (p) => p.purchase_price !== null && p.purchase_price > 1000
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Market trends and investment analysis across {validCount} properties
            with valid sale data.
          </p>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Purchase Timing vs Return */}
          <ChartCard
            title="Purchase Timing vs. Return"
            description="When each property was bought relative to total return. Dot size reflects living sqft."
          >
            <PurchaseTimingScatter properties={properties} />
          </ChartCard>

          {/* 2. Market Value Distribution */}
          <ChartCard
            title="Market Value Distribution"
            description="How current assessed market values are distributed across the community."
          >
            <ValueDistribution properties={properties} />
          </ChartCard>

          {/* 3. Purchase Price Over Time */}
          <ChartCard
            title="Purchase Price Over Time"
            description="Historical entry prices with a linear trend line showing community price evolution."
          >
            <AppreciationCurve properties={properties} />
          </ChartCard>

          {/* 4. Price Per Sqft Trend */}
          <ChartCard
            title="Price Per Sqft at Purchase"
            description="Purchase cost per square foot over time. Shows whether the neighborhood is getting more expensive."
          >
            <PricePerSqftTrend properties={properties} />
          </ChartCard>

          {/* 5. Holding Period vs Return */}
          <ChartCard
            title="Holding Period vs. Return"
            description="How long owners have held vs. their total return. Longer hold generally means higher return."
          >
            <HoldingPeriodScatter properties={properties} />
          </ChartCard>

          {/* 6. Bedroom Analysis (Placeholder) */}
          <ChartCard
            title="Bedroom Analysis"
            description="Average value, return, and price per sqft broken down by bedroom count."
          >
            <BedroomAnalysis />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
