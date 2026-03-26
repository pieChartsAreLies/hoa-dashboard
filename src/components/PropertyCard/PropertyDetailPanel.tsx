"use client";

import { useEffect, useRef, useState } from "react";
import type { PropertyWithMetrics, SaleRecord } from "@/lib/types";
import {
  formatCurrency,
  formatPct,
  formatNumber,
  monthsElapsed,
} from "@/lib/metrics";
import { calculateEquity, type EquityResult } from "@/lib/amortization";
import SellScenarioPanel from "@/components/SellScenario/SellScenarioPanel";

interface PropertyDetailPanelProps {
  property: PropertyWithMetrics;
  saleHistory: SaleRecord[];
  onClose: () => void;
  isFlip?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computeAnnualizedReturn(
  purchasePrice: number | null,
  marketValue: number | null,
  yearsHeld: number | null
): number | null {
  if (
    !purchasePrice ||
    purchasePrice <= 1000 ||
    !marketValue ||
    marketValue <= 0 ||
    !yearsHeld ||
    yearsHeld <= 0
  )
    return null;
  return (Math.pow(marketValue / purchasePrice, 1 / yearsHeld) - 1) * 100;
}

function computeEquity(property: PropertyWithMetrics): EquityResult | null {
  if (
    !property.purchase_price ||
    property.purchase_price <= 1000 ||
    !property.market_value ||
    property.market_value <= 0 ||
    !property.purchase_date ||
    !property.rate_at_purchase
  )
    return null;

  const months = monthsElapsed(property.purchase_date);
  if (months <= 0) return null;

  return calculateEquity({
    purchasePrice: property.purchase_price,
    downPaymentPct: 0.2,
    annualRate: property.rate_at_purchase,
    termYears: 30,
    monthsElapsed: months,
    currentMarketValue: property.market_value,
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h3>
  );
}

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md bg-slate-700/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          accent ? "text-teal-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FlipBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400"
      title="This property was resold within 3 years at 30%+ gain, indicating a likely flip or renovation"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
          clipRule="evenodd"
        />
      </svg>
      Likely Flip
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                        */
/* ------------------------------------------------------------------ */

export default function PropertyDetailPanel({
  property,
  saleHistory,
  onClose,
  isFlip = false,
}: PropertyDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showSellScenario, setShowSellScenario] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Derived values
  const gain = property.total_gain_dollars;
  const isPositiveGain = gain !== null && gain >= 0;
  const annualized = computeAnnualizedReturn(
    property.purchase_price,
    property.market_value,
    property.years_held
  );
  const equity = computeEquity(property);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-0 z-30 flex h-full w-full max-w-[400px] flex-col border-l border-white/10 bg-slate-800/95 shadow-[-4px_0_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-300 ease-out animate-slide-in-right sm:max-w-[400px]"
      style={{ maxHeight: "100%" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-700 px-5 py-4">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-white">
              {property.address}
            </h2>
            {isFlip && <FlipBadge />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">
            {property.owner_name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          aria-label="Close property detail panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Value Comparison */}
        <div>
          <SectionHeading>Value Comparison</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Purchase Price
              </p>
              <p className="mt-0.5 text-base font-bold text-white">
                {formatCurrency(property.purchase_price)}
              </p>
              {property.purchase_date && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {property.purchase_date}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-slate-700/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Market Value
              </p>
              <p className="mt-0.5 text-base font-bold text-white">
                {formatCurrency(property.market_value)}
              </p>
            </div>
          </div>
          {gain !== null && (
            <div
              className={`mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${
                isPositiveGain
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${isPositiveGain ? "" : "rotate-180"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {formatCurrency(Math.abs(gain))} {isPositiveGain ? "gain" : "loss"}
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div>
          <SectionHeading>Key Metrics</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            <MetricCell
              label="Total Return"
              value={formatPct(property.total_return_pct)}
              accent
            />
            <MetricCell
              label="Annual Return"
              value={formatPct(annualized)}
              accent
            />
            <MetricCell
              label="Total Gained"
              value={formatCurrency(property.total_gain_dollars)}
            />
            <MetricCell
              label="Years Held"
              value={
                property.years_held !== null
                  ? `${property.years_held.toFixed(1)} yrs`
                  : "N/A"
              }
            />
            <MetricCell
              label="Purchase $/sqft"
              value={
                property.price_per_sqft_purchase !== null
                  ? `$${formatNumber(property.price_per_sqft_purchase)}`
                  : "N/A"
              }
            />
            <MetricCell
              label="Current $/sqft"
              value={
                property.price_per_sqft_current !== null
                  ? `$${formatNumber(property.price_per_sqft_current)}`
                  : "N/A"
              }
            />
          </div>
        </div>

        {/* Equity Estimate */}
        {equity && (
          <div>
            <SectionHeading>Equity Estimate</SectionHeading>
            <p className="mb-2 text-[10px] text-slate-500">
              Assumptions: 20% down, 30yr fixed @{" "}
              {property.rate_at_purchase?.toFixed(2)}%
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCell
                label="Down Payment"
                value={formatCurrency(equity.downPayment)}
              />
              <MetricCell
                label="Original Loan"
                value={formatCurrency(equity.originalLoan)}
              />
              <MetricCell
                label="Monthly Payment"
                value={formatCurrency(equity.monthlyPayment)}
              />
              <MetricCell
                label="Remaining Principal"
                value={formatCurrency(equity.remainingPrincipal)}
              />
              <MetricCell
                label="Est. Equity"
                value={formatCurrency(equity.estimatedEquity)}
                accent
              />
              <MetricCell
                label="Equity %"
                value={formatPct(equity.equityPct * 100)}
                accent
              />
              <MetricCell
                label="Leverage Return"
                value={formatPct(equity.leverageReturn * 100)}
                accent
              />
            </div>
          </div>
        )}

        {/* What If I Sold Today? */}
        <div>
          <button
            onClick={() => setShowSellScenario(!showSellScenario)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-400 transition-all hover:border-teal-500/50 hover:bg-teal-500/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
            What If I Sold Today?
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${
                showSellScenario ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showSellScenario && (
            <div className="mt-3">
              <SellScenarioPanel property={property} />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div>
          <SectionHeading>Property Details</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            <MetricCell
              label="Living Sqft"
              value={formatNumber(property.living_sqft)}
            />
            <MetricCell
              label="Lot Sqft"
              value={formatNumber(property.lot_sqft)}
            />
            <MetricCell
              label="Year Built"
              value={property.year_built?.toString() ?? "N/A"}
            />
            <MetricCell
              label="Acres"
              value={
                property.acres !== null
                  ? property.acres.toFixed(2)
                  : "N/A"
              }
            />
            <div className="col-span-2 rounded-md bg-slate-700/40 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Homestead
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  property.homestead
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-600/50 text-slate-400"
                }`}
              >
                {property.homestead ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Sale History */}
        {saleHistory.length > 0 && (
          <div>
            <SectionHeading>Sale History</SectionHeading>
            <div className="space-y-1.5">
              {saleHistory.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-md bg-slate-700/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white">{sale.sale_date}</p>
                    {sale.buyer && (
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {sale.buyer}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(sale.sale_price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
