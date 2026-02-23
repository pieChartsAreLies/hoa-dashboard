"use client";

import { METRICS, type MetricKey } from "./metrics";

interface MetricSelectorProps {
  selected: MetricKey;
  onChange: (key: MetricKey) => void;
}

export default function MetricSelector({ selected, onChange }: MetricSelectorProps) {
  return (
    <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-md">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selected === m.key
                ? "bg-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
