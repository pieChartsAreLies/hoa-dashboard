import type { PropertyWithMetrics } from "@/lib/types";
import { calculateEquity } from "@/lib/amortization";
import { monthsElapsed } from "@/lib/metrics";

export type MetricKey =
  | "total_return_pct"
  | "annualized_return_pct"
  | "total_gain_dollars"
  | "price_per_sqft_current"
  | "price_per_sqft_purchase"
  | "estimated_equity"
  | "years_held";

export interface MetricConfig {
  key: MetricKey;
  label: string;
  format: (v: number | null) => string;
  colorType: "return" | "dollar";
  /** domain [min, max] computed at runtime */
  domain?: [number, number];
}

function fmtCurrency(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return `${v.toFixed(1)}%`;
}

function fmtYears(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return `${v.toFixed(1)} yrs`;
}

function fmtSqft(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return `$${v.toFixed(0)}/sqft`;
}

export const METRICS: MetricConfig[] = [
  { key: "total_return_pct", label: "Total Return %", format: fmtPct, colorType: "return" },
  { key: "annualized_return_pct", label: "Annual Return %", format: fmtPct, colorType: "return" },
  { key: "total_gain_dollars", label: "Total $ Gained", format: fmtCurrency, colorType: "dollar" },
  { key: "price_per_sqft_current", label: "Current $/sqft", format: fmtSqft, colorType: "dollar" },
  { key: "price_per_sqft_purchase", label: "Purchase $/sqft", format: fmtSqft, colorType: "dollar" },
  { key: "estimated_equity", label: "Est. Equity", format: fmtCurrency, colorType: "dollar" },
  { key: "years_held", label: "Years Held", format: fmtYears, colorType: "dollar" },
];

/**
 * Compute derived metric values for each property, returning a map of pcn -> metric values.
 */
export function computePropertyMetrics(
  properties: PropertyWithMetrics[]
): Map<string, Record<MetricKey, number | null>> {
  const map = new Map<string, Record<MetricKey, number | null>>();

  for (const p of properties) {
    // Annualized return: client-side calculation
    let annualized: number | null = null;
    if (
      p.purchase_price &&
      p.purchase_price > 1000 &&
      p.market_value &&
      p.market_value > 0 &&
      p.years_held &&
      p.years_held > 0
    ) {
      annualized =
        (Math.pow(p.market_value / p.purchase_price, 1 / p.years_held) - 1) * 100;
    }

    // Estimated equity: client-side via amortization
    let equity: number | null = null;
    if (
      p.purchase_price &&
      p.purchase_price > 1000 &&
      p.market_value &&
      p.market_value > 0 &&
      p.purchase_date &&
      p.rate_at_purchase
    ) {
      const months = monthsElapsed(p.purchase_date);
      if (months > 0) {
        const result = calculateEquity({
          purchasePrice: p.purchase_price,
          downPaymentPct: 0.2,
          annualRate: p.rate_at_purchase,
          termYears: 30,
          monthsElapsed: months,
          currentMarketValue: p.market_value,
        });
        equity = result.estimatedEquity;
      }
    }

    map.set(p.pcn, {
      total_return_pct: p.total_return_pct,
      annualized_return_pct: annualized,
      total_gain_dollars: p.total_gain_dollars,
      price_per_sqft_current: p.price_per_sqft_current,
      price_per_sqft_purchase: p.price_per_sqft_purchase,
      estimated_equity: equity,
      years_held: p.years_held,
    });
  }

  return map;
}

/**
 * Get the min and max of a metric across all properties, ignoring nulls.
 * Optionally exclude specific PCNs from the domain calculation.
 */
export function getMetricDomain(
  metricMap: Map<string, Record<MetricKey, number | null>>,
  key: MetricKey,
  excludedPcns?: Set<string>
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [pcn, metrics] of metricMap.entries()) {
    if (excludedPcns && excludedPcns.size > 0 && excludedPcns.has(pcn)) continue;
    const v = metrics[key];
    if (v !== null && v !== undefined && isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}
