"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldAlert, Loader2, Check, Save, Download } from "lucide-react";
import ScrambleCell from "./ScrambleCell";

interface DataTableProps {
  query: string;
  note: string;
  columns: string[];
  rows: Record<string, string | number>[];
  sourceBadge?: string;
  targetTotal?: number;
  onSaveToDatabase?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onDownloadExcel?: () => void;
  isAnimatingSnapshot?: boolean;
}

type SortDirection = "asc" | "desc" | null;

export default function DataTable({
  query,
  note,
  columns,
  rows,
  sourceBadge = "Fast (model knowledge)",
  targetTotal,
  onSaveToDatabase,
  isSaving,
  isSaved,
  onDownloadExcel,
  isAnimatingSnapshot,
}: DataTableProps) {
  const [filterText, setFilterText] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Toggle sorting: none -> asc -> desc -> none
  const handleSort = (column: string) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  // Automatically heal model rank hallucinations (e.g. copying a year like 2019 into the Rank column)
  const sanitizedRows = useMemo(() => {
    const rankCol = columns.find((c) => /^(#|rank|position|pos|s\.?no\.?)$/i.test(c.trim()));
    if (!rankCol) return rows;

    return rows.map((row, idx) => {
      const val = row[rankCol];
      const numVal = Number(val);
      // If rank is missing or clearly a year/hallucination (> 1900 or non-consecutive anomaly)
      if (
        val === undefined ||
        val === null ||
        (!isNaN(numVal) && numVal > rows.length * 2 && numVal >= 1900) ||
        (!isNaN(numVal) && numVal !== idx + 1 && rows.length > 2 && idx > 0 && Number(rows[idx - 1][rankCol]) === idx)
      ) {
        return { ...row, [rankCol]: idx + 1 };
      }
      return row;
    });
  }, [rows, columns]);

  // Filter rows across all columns
  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return sanitizedRows;
    const lowerFilter = filterText.toLowerCase();

    return sanitizedRows.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerFilter);
      })
    );
  }, [sanitizedRows, columns, filterText]);

  // Sort rows based on active sort column and direction
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  return (
    <div
      id="astral-data-table"
      className="relative flex flex-col w-full max-h-[calc(100dvh-95px)] sm:max-h-[calc(100vh-130px)] rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-3xl bg-[#09090b]/98 border border-white/20 border-t-white/50 shadow-[0_20px_70px_rgba(0,0,0,0.98),inset_0_1px_2px_rgba(255,255,255,0.35)] text-zinc-100"
    >
      {/* Specular Liquid Glass Top Sheen - High Gloss */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-transparent pointer-events-none rounded-t-2xl" />

      {/* Table Header Metadata - Compact Padding */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-white/10 bg-white/[0.02] relative z-10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight break-words line-clamp-1 sm:line-clamp-none">{query}</h2>
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-white/[0.06] text-zinc-300 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] shrink-0">
              {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* Source Badge */}
          <div className="shrink-0">
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono bg-white/[0.04] text-zinc-400 border border-white/10">
              Source: <strong className="ml-1 sm:ml-1.5 font-semibold text-white">{sourceBadge}</strong>
            </span>
          </div>
        </div>

        {note && (
          <div
            className={`text-[11px] sm:text-xs rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 mt-2 flex items-start gap-2 backdrop-blur-md ${
              note.toLowerCase().includes("not possible") || note.toLowerCase().includes("manipulation")
                ? "bg-amber-950/40 border border-amber-500/40 text-amber-200"
                : "bg-white/[0.03] border border-white/15 text-zinc-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            }`}
          >
            {(note.toLowerCase().includes("not possible") || note.toLowerCase().includes("manipulation")) && (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <p className="leading-snug break-words">
              <span className="font-semibold text-white">Observation: </span>
              {note.replace(/^(?:Note:\s*)+/i, "")}
            </p>
          </div>
        )}

        {/* Toolbar: Search input on left, Action icon buttons on right */}
        <div className="mt-2 sm:mt-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter records..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 text-xs bg-black/60 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 text-white placeholder:text-zinc-500 transition shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            />
          </div>

          {/* Action Icon Buttons - Save (Upload to Vault) & Download (Download in XLSX) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSaveToDatabase && (
              <button
                type="button"
                onClick={onSaveToDatabase}
                disabled={isSaving || isSaved || isAnimatingSnapshot}
                className={`p-2 min-w-[34px] min-h-[34px] rounded-xl border text-xs font-mono transition-all shadow-sm flex items-center justify-center touch-manipulation ${
                  isSaved
                    ? "bg-white/15 border-white/30 text-white cursor-default"
                    : "bg-white/[0.06] hover:bg-white text-zinc-300 hover:text-black border-white/15 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                title={isSaved ? "Uploaded to Vault" : "Upload to Vault"}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-white" />
                ) : isSaved ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
                )}
              </button>
            )}

            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                disabled={isAnimatingSnapshot}
                className="p-2 min-w-[34px] min-h-[34px] rounded-xl bg-white/[0.06] hover:bg-white text-zinc-300 hover:text-black border border-white/15 hover:border-white/30 text-xs font-mono transition-all shadow-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                title="Download in XLSX"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Scroll Area - Dynamically fits content, bounded by card max-h so bottom is always visible */}
      <div className="flex-1 min-h-0 overflow-auto relative touch-pan-x touch-pan-y overscroll-contain">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-zinc-950/95 text-zinc-300 sticky top-0 z-10 shadow-sm border-b border-white/15 backdrop-blur-md">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-semibold select-none cursor-pointer hover:bg-white/[0.06] transition whitespace-nowrap text-[11px] sm:text-xs font-mono tracking-wider uppercase text-zinc-300"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      <span className="text-zinc-500">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white font-bold" />
                          ) : (
                            <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-500" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-zinc-500 font-mono text-xs">
                  {filterText ? "No matching records found in this dimension." : "No data available."}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr
                  key={index}
                  className={`animate-row-sensible transition-colors duration-150 ${
                    index % 2 === 0 ? "bg-[#09090b] hover:bg-white/[0.06]" : "bg-zinc-950/90 hover:bg-white/[0.06]"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 25, 1000)}ms` }}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col} className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-zinc-200">
                      <ScrambleCell
                        value={row[col]}
                        shouldAnimate={index < 12}
                        delayMs={Math.min(index * 25, 1000) + colIdx * 30}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Disclaimer */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 font-mono shrink-0 gap-2">
        <span className="truncate max-w-[60%] sm:max-w-none">Verified structured output • Nexus compliant</span>
        <span className="shrink-0">{sortedRows.length} / {rows.length} rows</span>
      </div>
    </div>
  );
}
