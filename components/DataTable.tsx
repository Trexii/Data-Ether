"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldAlert } from "lucide-react";

interface DataTableProps {
  query: string;
  note: string;
  columns: string[];
  rows: Record<string, string | number>[];
  sourceBadge?: string;
  targetTotal?: number;
}

type SortDirection = "asc" | "desc" | null;

export default function DataTable({
  query,
  note,
  columns,
  rows,
  sourceBadge = "Fast (model knowledge)",
  targetTotal,
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

  // Filter rows across all columns
  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return rows;
    const lowerFilter = filterText.toLowerCase();

    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerFilter);
      })
    );
  }, [rows, columns, filterText]);

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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md animate-table-spring">
      {/* Table Header Metadata */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{query}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {rows.length} {rows.length === 1 ? "row" : "rows"}
            </span>
          </div>

          {/* Source Badge */}
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Source: <strong className="ml-1 font-semibold text-slate-900">{sourceBadge}</strong>
            </span>
          </div>
        </div>

        {note && (
          <div
            className={`text-sm rounded-lg p-3 mt-2 flex items-start gap-2.5 ${
              note.toLowerCase().includes("not possible") || note.toLowerCase().includes("manipulation")
                ? "bg-amber-50 border border-amber-300 text-amber-900"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {(note.toLowerCase().includes("not possible") || note.toLowerCase().includes("manipulation")) && (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">
              <span className="font-semibold text-slate-800">Note: </span>
              {note.replace(/^(?:Note:\s*)+/i, "")}
            </p>
          </div>
        )}

        {/* Search / Filter box */}
        <div className="mt-4 relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter displayed rows..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
          />
        </div>
      </div>

      {/* Table Scroll Area */}
      <div className="overflow-x-auto max-h-[550px] relative">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-xs">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-3 px-4 font-semibold select-none cursor-pointer hover:bg-slate-200 transition border-b border-slate-200 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      <span className="text-slate-400">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                  {filterText ? "No matching records found." : "No data available."}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr
                  key={index}
                  className={`animate-row-bounce row-hover-lift transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${
                    index % 2 === 0 ? "bg-white hover:bg-blue-50/50" : "bg-slate-50/60 hover:bg-blue-50/50"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 35, 1400)}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : "N/A"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Disclaimer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <span>AI-generated data. Verify before use.</span>
        <span>Showing {sortedRows.length} of {rows.length} rows</span>
      </div>
    </div>
  );
}
