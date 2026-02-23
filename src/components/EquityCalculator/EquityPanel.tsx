"use client";

export interface EquitySettings {
  downPaymentPct: number;
  termYears: 15 | 30;
  rateMode: "historical" | "custom";
  customRate: number;
}

interface EquityPanelProps {
  settings: EquitySettings;
  onChange: (settings: EquitySettings) => void;
}

export const DEFAULT_EQUITY_SETTINGS: EquitySettings = {
  downPaymentPct: 20,
  termYears: 30,
  rateMode: "historical",
  customRate: 6.5,
};

export default function EquityPanel({ settings, onChange }: EquityPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-700/50 bg-slate-800/60 px-5 py-3">
      {/* Down Payment Slider */}
      <div className="flex items-center gap-3">
        <label className="whitespace-nowrap text-xs font-medium text-slate-400">
          Down Payment
        </label>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={settings.downPaymentPct}
          onChange={(e) =>
            onChange({ ...settings, downPaymentPct: Number(e.target.value) })
          }
          className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-slate-600
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:bg-teal-400"
        />
        <span className="min-w-[3ch] text-right text-sm font-semibold text-teal-400">
          {settings.downPaymentPct}%
        </span>
      </div>

      {/* Loan Term Toggle */}
      <div className="flex items-center gap-3">
        <label className="whitespace-nowrap text-xs font-medium text-slate-400">
          Loan Term
        </label>
        <div className="flex rounded-lg border border-slate-600/50 bg-slate-900/50 p-0.5">
          {([15, 30] as const).map((term) => (
            <button
              key={term}
              onClick={() => onChange({ ...settings, termYears: term })}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                settings.termYears === term
                  ? "bg-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {term}yr
            </button>
          ))}
        </div>
      </div>

      {/* Rate Source */}
      <div className="flex items-center gap-3">
        <label className="whitespace-nowrap text-xs font-medium text-slate-400">
          Rate
        </label>
        <div className="flex rounded-lg border border-slate-600/50 bg-slate-900/50 p-0.5">
          <button
            onClick={() => onChange({ ...settings, rateMode: "historical" })}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              settings.rateMode === "historical"
                ? "bg-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            Historical
          </button>
          <button
            onClick={() => onChange({ ...settings, rateMode: "custom" })}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              settings.rateMode === "custom"
                ? "bg-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            Custom
          </button>
        </div>
        {settings.rateMode === "custom" && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={15}
              step={0.125}
              value={settings.customRate}
              onChange={(e) =>
                onChange({ ...settings, customRate: Number(e.target.value) })
              }
              className="w-16 rounded-md border border-slate-600/50 bg-slate-900/50 px-2 py-1 text-right text-xs text-white outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        )}
      </div>
    </div>
  );
}
