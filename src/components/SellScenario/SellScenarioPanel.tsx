"use client";

import { useMemo, useState } from "react";
import type { PropertyWithMetrics } from "@/lib/types";
import { calculateEquity } from "@/lib/amortization";
import { monthsElapsed, formatCurrency } from "@/lib/metrics";

interface SellScenarioPanelProps {
  property: PropertyWithMetrics;
}

function LineItem({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "teal" | "white";
  bold?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    green: "text-emerald-400",
    red: "text-red-400",
    teal: "text-teal-400",
    white: "text-white",
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`font-mono text-sm ${colorClasses[color]} ${
          bold ? "font-bold text-base" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function SellScenarioPanel({ property }: SellScenarioPanelProps) {
  const [commissionPct, setCommissionPct] = useState(6);

  const scenario = useMemo(() => {
    const salePrice = property.market_value;
    if (!salePrice || salePrice <= 0) return null;

    const commission = salePrice * (commissionPct / 100);
    const docStamps = salePrice * 0.007;

    // Calculate remaining mortgage
    let remainingMortgage = 0;
    if (
      property.purchase_price &&
      property.purchase_price > 1000 &&
      property.purchase_date &&
      property.rate_at_purchase
    ) {
      const months = monthsElapsed(property.purchase_date);
      if (months > 0) {
        const equity = calculateEquity({
          purchasePrice: property.purchase_price,
          downPaymentPct: 0.2,
          annualRate: property.rate_at_purchase,
          termYears: 30,
          monthsElapsed: months,
          currentMarketValue: salePrice,
        });
        remainingMortgage = equity.remainingPrincipal;
      }
    }

    const netProceeds = salePrice - commission - docStamps - remainingMortgage;

    return {
      salePrice,
      commission,
      docStamps,
      remainingMortgage,
      netProceeds,
    };
  }, [property, commissionPct]);

  if (!scenario) {
    return (
      <div className="rounded-lg border border-slate-600/50 bg-slate-700/30 px-4 py-3">
        <p className="text-sm text-slate-400">
          Insufficient data to model a sale scenario for this property.
        </p>
      </div>
    );
  }

  const isPositive = scenario.netProceeds >= 0;

  return (
    <div className="rounded-lg border border-teal-500/20 bg-slate-700/30 px-4 py-4">
      {/* Commission slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="commission-slider"
            className="text-xs font-medium text-slate-400"
          >
            Agent Commission
          </label>
          <span className="rounded bg-slate-600/50 px-2 py-0.5 font-mono text-xs font-semibold text-teal-400">
            {commissionPct.toFixed(1)}%
          </span>
        </div>
        <input
          id="commission-slider"
          type="range"
          min={0}
          max={8}
          step={0.5}
          value={commissionPct}
          onChange={(e) => setCommissionPct(parseFloat(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600 accent-teal-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>0%</span>
          <span>8%</span>
        </div>
      </div>

      {/* Itemized breakdown */}
      <div className="space-y-0.5">
        <LineItem
          label="Estimated Sale Price"
          value={formatCurrency(scenario.salePrice)}
          color="green"
        />
        <LineItem
          label={`Less: Agent Commission (${commissionPct.toFixed(1)}%)`}
          value={`-${formatCurrency(scenario.commission)}`}
          color="red"
        />
        <LineItem
          label="Less: FL Doc Stamps (0.7%)"
          value={`-${formatCurrency(scenario.docStamps)}`}
          color="red"
        />
        {scenario.remainingMortgage > 0 && (
          <LineItem
            label="Less: Remaining Mortgage"
            value={`-${formatCurrency(scenario.remainingMortgage)}`}
            color="red"
          />
        )}

        {/* Divider */}
        <div className="my-2 border-t border-slate-600/60" />

        <LineItem
          label="Net Proceeds"
          value={
            isPositive
              ? formatCurrency(scenario.netProceeds)
              : `-${formatCurrency(Math.abs(scenario.netProceeds))}`
          }
          color={isPositive ? "teal" : "red"}
          bold
        />
      </div>

      {/* Fine print */}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Estimate only. Uses PAPA assessed market value, assumed 20% down / 30yr
        fixed mortgage, and FL documentary stamp rate of $0.70 per $100. Does
        not include title insurance, prorated taxes, HOA dues, or other closing
        costs.
      </p>
    </div>
  );
}
