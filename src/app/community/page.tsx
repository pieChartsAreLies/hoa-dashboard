"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PropertyWithMetrics, CommunityStats } from "@/lib/types";
import {
  formatCurrency,
  formatPct,
  formatNumber,
  yearsHeld,
} from "@/lib/metrics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsResponse {
  stats: CommunityStats;
  byBedrooms: unknown[];
}

interface NotableSale {
  label: string;
  address: string;
  detail: string;
  subDetail?: string;
}

/* ------------------------------------------------------------------ */
/*  Shared Card Wrapper                                                */
/* ------------------------------------------------------------------ */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-800 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold text-white">{children}</h2>;
}

/* ------------------------------------------------------------------ */
/*  Hero Stat Card                                                     */
/* ------------------------------------------------------------------ */

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <p className="text-2xl font-bold text-teal-400 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Colors                                                       */
/* ------------------------------------------------------------------ */

const PIE_COLORS = ["#2dd4bf", "#64748b"]; // teal-400, slate-500
const BAR_COLOR = "#2dd4bf";

/* ------------------------------------------------------------------ */
/*  Sqft Bins Helper                                                   */
/* ------------------------------------------------------------------ */

function buildSqftBins(properties: PropertyWithMetrics[]) {
  const bins: Record<string, number> = {};
  const binSize = 250;

  for (const p of properties) {
    if (!p.living_sqft || p.living_sqft <= 0) continue;
    const lower = Math.floor(p.living_sqft / binSize) * binSize;
    const upper = lower + binSize;
    const label = `${formatNumber(lower)}-${formatNumber(upper)}`;
    bins[label] = (bins[label] || 0) + 1;
  }

  return Object.entries(bins)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => {
      const aNum = parseInt(a.range.replace(/,/g, ""));
      const bNum = parseInt(b.range.replace(/,/g, ""));
      return aNum - bNum;
    });
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip for Bar Chart                                       */
/* ------------------------------------------------------------------ */

function BarTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{label} sqft</p>
      <p className="text-slate-300">
        {payload[0].value} {payload[0].value === 1 ? "property" : "properties"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function CommunityPage() {
  const [properties, setProperties] = useState<PropertyWithMetrics[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [propsRes, statsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/stats"),
        ]);
        if (!propsRes.ok) throw new Error(`Properties API: ${propsRes.status}`);
        if (!statsRes.ok) throw new Error(`Stats API: ${statsRes.status}`);

        const propsData = (await propsRes.json()) as PropertyWithMetrics[];
        const statsData = (await statsRes.json()) as StatsResponse;

        setProperties(propsData);
        setStats(statsData.stats);
      } catch (err) {
        console.error("Failed to fetch community data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ---- Derived data ---- */

  const communityProfile = useMemo(() => {
    if (!properties.length) return null;

    const years = properties
      .map((p) => p.year_built)
      .filter((y): y is number => y !== null && y > 0);
    const sqfts = properties
      .map((p) => p.living_sqft)
      .filter((s): s is number => s !== null && s > 0);
    const values = properties
      .map((p) => p.current_value)
      .filter((v): v is number => v !== null && v > 0);

    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
      minSqft: Math.min(...sqfts),
      maxSqft: Math.max(...sqfts),
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [properties]);

  const homesteadData = useMemo(() => {
    const hs = properties.filter((p) => p.homestead === 1).length;
    const nonHs = properties.length - hs;
    return [
      { name: "Homestead", value: hs },
      { name: "Non-Homestead", value: nonHs },
    ];
  }, [properties]);

  const sqftBins = useMemo(() => buildSqftBins(properties), [properties]);

  const notableSales = useMemo((): NotableSale[] => {
    if (!properties.length) return [];

    // Filter to properties with valid sale data
    const withSale = properties.filter(
      (p) =>
        p.purchase_date !== null &&
        p.purchase_price !== null &&
        p.purchase_price > 1000
    );

    if (!withSale.length) return [];

    const results: NotableSale[] = [];

    // Most recent sale
    const sorted = [...withSale].sort(
      (a, b) =>
        new Date(b.purchase_date!).getTime() -
        new Date(a.purchase_date!).getTime()
    );
    const mostRecent = sorted[0];
    results.push({
      label: "Most Recent Sale",
      address: mostRecent.address,
      detail: `${formatCurrency(mostRecent.purchase_price)} on ${mostRecent.purchase_date}`,
    });

    // Highest sale
    const byPrice = [...withSale].sort(
      (a, b) => (b.purchase_price ?? 0) - (a.purchase_price ?? 0)
    );
    const highest = byPrice[0];
    results.push({
      label: "Highest Purchase Price",
      address: highest.address,
      detail: `${formatCurrency(highest.purchase_price)} on ${highest.purchase_date}`,
    });

    // Oldest holding (earliest purchase date)
    const oldest = sorted[sorted.length - 1];
    results.push({
      label: "Oldest Holding",
      address: oldest.address,
      detail: `Purchased ${oldest.purchase_date}`,
      subDetail: `${formatCurrency(oldest.purchase_price)}`,
    });

    // Longest hold (most years)
    const withYears = withSale
      .map((p) => ({
        ...p,
        yrsHeld: yearsHeld(p.purchase_date!),
      }))
      .filter((p) => p.yrsHeld !== null && p.yrsHeld > 0)
      .sort((a, b) => (b.yrsHeld ?? 0) - (a.yrsHeld ?? 0));

    if (withYears.length) {
      const longest = withYears[0];
      results.push({
        label: "Longest Hold",
        address: longest.address,
        detail: `${Math.round(longest.yrsHeld!)} years`,
        subDetail: `Since ${longest.purchase_date}`,
      });
    }

    return results;
  }, [properties]);

  const quickStats = useMemo(() => {
    if (!properties.length || !stats) return [];

    const sqfts = properties
      .map((p) => p.living_sqft)
      .filter((s): s is number => s !== null && s > 0);
    const acres = properties
      .map((p) => p.acres)
      .filter((a): a is number => a !== null && a > 0);
    const years = properties
      .map((p) => p.year_built)
      .filter((y): y is number => y !== null && y > 0);
    const homesteadCount = properties.filter((p) => p.homestead === 1).length;
    const overMillion = properties.filter(
      (p) => p.current_value !== null && p.current_value > 1000000
    ).length;
    const newestYear = years.length ? Math.max(...years) : null;

    const avgSqft = sqfts.length
      ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length)
      : null;
    const avgAcres = acres.length
      ? (acres.reduce((a, b) => a + b, 0) / acres.length).toFixed(2)
      : "N/A";
    const avgYear = years.length
      ? Math.round(years.reduce((a, b) => a + b, 0) / years.length)
      : null;
    const hsPct =
      properties.length > 0
        ? ((homesteadCount / properties.length) * 100).toFixed(1)
        : "0";

    return [
      { label: "Avg Living SqFt", value: formatNumber(avgSqft) },
      { label: "Avg Lot Size", value: `${avgAcres} acres` },
      { label: "Avg Year Built", value: avgYear?.toString() ?? "N/A" },
      { label: "Homestead %", value: `${hsPct}%` },
      { label: "Values Over $1M", value: overMillion.toString() },
      { label: "Newest Construction", value: newestYear?.toString() ?? "N/A" },
    ];
  }, [properties, stats]);

  /* ---- Loading / Error states ---- */

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">
            Loading community data...
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

  if (!stats) return null;

  /* ---- Render ---- */

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Community Summary</h1>
          <p className="mt-1 text-sm text-slate-400">
            Los Paseos of Via Verde overview and key metrics
          </p>
        </div>

        {/* 1. Hero Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <HeroStat
            value={formatCurrency(stats.total_community_value)}
            label="Total Community Value"
          />
          <HeroStat
            value={formatNumber(stats.total_properties)}
            label="Properties"
          />
          <HeroStat
            value={formatCurrency(stats.avg_market_value)}
            label="Avg Est. Value"
          />
          <HeroStat
            value={formatPct(stats.avg_return_pct)}
            label="Avg Return %"
          />
          <HeroStat
            value={`$${formatNumber(stats.avg_price_per_sqft)}`}
            label="Avg $/sqft"
          />
        </div>

        {/* 2. Community Profile */}
        {communityProfile && (
          <Card>
            <SectionHeading>Community Profile</SectionHeading>
            <div className="space-y-2 text-sm leading-relaxed text-slate-300">
              <p>
                Los Paseos of Via Verde is a gated single-family community in
                Boca Raton, FL, located at Glades Road and Powerline Road.
              </p>
              <p>
                Built between{" "}
                <span className="font-medium text-white">
                  {communityProfile.minYear}
                </span>{" "}
                and{" "}
                <span className="font-medium text-white">
                  {communityProfile.maxYear}
                </span>
                .
              </p>
              <p>
                Homes range from{" "}
                <span className="font-medium text-white">
                  {formatNumber(communityProfile.minSqft)}
                </span>{" "}
                to{" "}
                <span className="font-medium text-white">
                  {formatNumber(communityProfile.maxSqft)}
                </span>{" "}
                sq ft.
              </p>
              <p>
                Current values range from{" "}
                <span className="font-medium text-white">
                  {formatCurrency(communityProfile.minValue)}
                </span>{" "}
                to{" "}
                <span className="font-medium text-white">
                  {formatCurrency(communityProfile.maxValue)}
                </span>
                .
              </p>
            </div>
          </Card>
        )}

        {/* 3. Property Mix */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Homestead Pie Chart */}
          <Card>
            <SectionHeading>Homestead Status</SectionHeading>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={homesteadData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {homesteadData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="shrink-0 space-y-3">
                {homesteadData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: PIE_COLORS[idx] }}
                    />
                    <span className="text-sm text-slate-300">
                      {d.name}:{" "}
                      <span className="font-medium text-white">{d.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* SqFt Distribution Bar Chart */}
          <Card>
            <SectionHeading>Living SqFt Distribution</SectionHeading>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={sqftBins}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* 4. Notable Sales */}
        {notableSales.length > 0 && (
          <Card>
            <SectionHeading>Notable Sales</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              {notableSales.map((sale) => (
                <div
                  key={sale.label}
                  className="rounded-md border border-slate-700 bg-slate-900/50 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {sale.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {sale.address}
                  </p>
                  <p className="mt-0.5 text-sm text-teal-400">{sale.detail}</p>
                  {sale.subDetail && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {sale.subDetail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 5. Quick Stats Grid */}
        {quickStats.length > 0 && (
          <Card>
            <SectionHeading>Quick Stats</SectionHeading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {quickStats.map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
