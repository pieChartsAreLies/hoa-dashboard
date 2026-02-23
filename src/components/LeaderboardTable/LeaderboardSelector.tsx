"use client";

export type PresetKey =
  | "best_investment"
  | "biggest_winner"
  | "best_deal"
  | "most_valuable"
  | "most_equity"
  | "best_leverage"
  | "og_residents"
  | "newest_buyers";

export interface PresetConfig {
  key: PresetKey;
  label: string;
  sortField: string;
  sortDir: "asc" | "desc";
}

export const PRESETS: PresetConfig[] = [
  { key: "best_investment", label: "Best Investment", sortField: "annualized_return_pct", sortDir: "desc" },
  { key: "biggest_winner", label: "Biggest Winner", sortField: "total_gain_dollars", sortDir: "desc" },
  { key: "best_deal", label: "Best Deal", sortField: "price_per_sqft_purchase", sortDir: "asc" },
  { key: "most_valuable", label: "Most Valuable", sortField: "market_value", sortDir: "desc" },
  { key: "most_equity", label: "Most Equity", sortField: "estimated_equity", sortDir: "desc" },
  { key: "best_leverage", label: "Best Leverage", sortField: "leverage_return", sortDir: "desc" },
  { key: "og_residents", label: "OG Residents", sortField: "purchase_date", sortDir: "asc" },
  { key: "newest_buyers", label: "Newest Buyers", sortField: "purchase_date", sortDir: "desc" },
];

interface LeaderboardSelectorProps {
  selected: PresetKey;
  onChange: (key: PresetKey) => void;
}

export default function LeaderboardSelector({ selected, onChange }: LeaderboardSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-md">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            selected === p.key
              ? "bg-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/10"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
