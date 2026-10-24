"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatPct } from "@/lib/metrics";

export interface LeaderboardRow {
  pcn: string;
  address: string;
  purchase_price: number | null;
  current_value: number | null;
  total_return_pct: number | null;
  annualized_return_pct: number | null;
  total_gain_dollars: number | null;
  price_per_sqft_current: number | null;
  estimated_equity: number | null;
  leverage_return: number | null;
  purchase_date: string | null;
  price_per_sqft_purchase: number | null;
  flip_return_pct?: number | null;
  isFlip?: boolean;
  /** True if this property has valid metrics (purchase_price > 1000) */
  hasMetrics: boolean;
}

type SortDir = "asc" | "desc";

interface ColumnDef {
  key: string;
  label: string;
  align: "left" | "right";
  format: (row: LeaderboardRow) => string;
  colorize?: (row: LeaderboardRow) => string;
  sortValue: (row: LeaderboardRow) => number | null;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "rank",
    label: "#",
    align: "right",
    format: () => "",
    sortValue: () => null,
  },
  {
    key: "address",
    label: "Address",
    align: "left",
    format: (r) => r.address,
    sortValue: () => null,
  },
  {
    key: "purchase_price",
    label: "Purchase Price",
    align: "right",
    format: (r) => formatCurrency(r.purchase_price),
    sortValue: (r) => r.purchase_price,
  },
  {
    key: "current_value",
    label: "Current Value",
    align: "right",
    format: (r) => formatCurrency(r.current_value),
    sortValue: (r) => r.current_value,
  },
  {
    key: "total_return_pct",
    label: "Total Return %",
    align: "right",
    format: (r) => formatPct(r.total_return_pct),
    colorize: (r) => colorForValue(r.total_return_pct),
    sortValue: (r) => r.total_return_pct,
  },
  {
    key: "annualized_return_pct",
    label: "Annual Return %",
    align: "right",
    format: (r) => formatPct(r.annualized_return_pct),
    colorize: (r) => colorForValue(r.annualized_return_pct),
    sortValue: (r) => r.annualized_return_pct,
  },
  {
    key: "total_gain_dollars",
    label: "Total $ Gained",
    align: "right",
    format: (r) => formatCurrency(r.total_gain_dollars),
    colorize: (r) => colorForValue(r.total_gain_dollars),
    sortValue: (r) => r.total_gain_dollars,
  },
  {
    key: "price_per_sqft_current",
    label: "$/sqft",
    align: "right",
    format: (r) =>
      r.price_per_sqft_current !== null
        ? `$${r.price_per_sqft_current.toFixed(0)}`
        : "N/A",
    sortValue: (r) => r.price_per_sqft_current,
  },
  {
    key: "estimated_equity",
    label: "Est. Equity",
    align: "right",
    format: (r) => formatCurrency(r.estimated_equity),
    sortValue: (r) => r.estimated_equity,
  },
];

function colorForValue(v: number | null): string {
  if (v === null) return "text-slate-500";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-slate-300";
}

const MEDAL_COLORS = [
  { bg: "border-l-2 border-l-[#FFD700]", text: "text-[#FFD700]" },
  { bg: "border-l-2 border-l-[#C0C0C0]", text: "text-[#C0C0C0]" },
  { bg: "border-l-2 border-l-[#CD7F32]", text: "text-[#CD7F32]" },
];

function FlipBadgeSmall() {
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-400"
      title="Likely flip/renovation: resold within 3 years at 30%+ gain"
    >
      Flip
    </span>
  );
}

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  sortField: string;
  sortDir: SortDir;
  onSortChange: (field: string, dir: SortDir) => void;
}

export default function LeaderboardTable({
  rows,
  sortField,
  sortDir,
  onSortChange,
}: LeaderboardTableProps) {
  const [selectedPcn, setSelectedPcn] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    const withMetrics = rows.filter((r) => r.hasMetrics);
    const withoutMetrics = rows.filter((r) => !r.hasMetrics);

    const col = COLUMNS.find((c) => c.key === sortField);

    // For date-based sorts, handle specially
    if (sortField === "purchase_date") {
      withMetrics.sort((a, b) => {
        const aDate = a.purchase_date ?? "";
        const bDate = b.purchase_date ?? "";
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        const cmp = aDate.localeCompare(bDate);
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else if (sortField === "leverage_return") {
      withMetrics.sort((a, b) => {
        const aVal = a.leverage_return;
        const bVal = b.leverage_return;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    } else if (sortField === "price_per_sqft_purchase") {
      withMetrics.sort((a, b) => {
        const aVal = a.price_per_sqft_purchase;
        const bVal = b.price_per_sqft_purchase;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    } else if (sortField === "flip_return_pct") {
      withMetrics.sort((a, b) => {
        const aVal = a.flip_return_pct ?? null;
        const bVal = b.flip_return_pct ?? null;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    } else if (col) {
      withMetrics.sort((a, b) => {
        const aVal = col.sortValue(a);
        const bVal = col.sortValue(b);
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return [...withMetrics, ...withoutMetrics];
  }, [rows, sortField, sortDir]);

  function handleHeaderClick(colKey: string) {
    if (colKey === "rank") return;
    if (colKey === "address") return;
    if (sortField === colKey) {
      onSortChange(colKey, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(colKey, "desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80">
            {COLUMNS.map((col) => {
              const isSorted = sortField === col.key;
              const isSortable = col.key !== "rank" && col.key !== "address";
              return (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${
                    isSortable
                      ? "cursor-pointer select-none transition-colors hover:text-teal-400"
                      : ""
                  } ${isSorted ? "text-teal-400" : "text-slate-400"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {isSorted && (
                      <span className="text-teal-400">
                        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => {
            const isTopThree = row.hasMetrics && idx < 3;
            const medal = isTopThree ? MEDAL_COLORS[idx] : null;
            const isSelected = selectedPcn === row.pcn;

            return (
              <tr
                key={row.pcn}
                onClick={() => setSelectedPcn(row.pcn === selectedPcn ? null : row.pcn)}
                className={`border-b border-slate-700/50 transition-colors cursor-pointer ${
                  !row.hasMetrics
                    ? "opacity-40"
                    : isSelected
                      ? "bg-teal-500/10"
                      : "hover:bg-slate-700/30"
                } ${medal ? medal.bg : ""}`}
              >
                {COLUMNS.map((col) => {
                  if (col.key === "rank") {
                    const rank = row.hasMetrics ? idx + 1 : "-";
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${
                          medal ? medal.text : "text-slate-500"
                        }`}
                      >
                        {rank}
                      </td>
                    );
                  }

                  if (col.key === "address") {
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 text-left font-medium text-slate-200"
                      >
                        <span className="inline-flex items-center">
                          {row.address}
                          {row.isFlip && <FlipBadgeSmall />}
                        </span>
                      </td>
                    );
                  }

                  const value = col.format(row);
                  const color =
                    !row.hasMetrics
                      ? "text-slate-500"
                      : col.colorize
                        ? col.colorize(row)
                        : "text-slate-200";

                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 ${
                        col.align === "right" ? "text-right font-mono" : "text-left"
                      } ${color}`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
