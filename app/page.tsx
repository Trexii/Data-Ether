"use client";

import { useState, useRef } from "react";
import { Sparkles, Database, FileSpreadsheet, Search, Clock, Loader2, Check, Zap } from "lucide-react";
import DataTable from "@/components/DataTable";
import TableSkeleton from "@/components/TableSkeleton";
import ErrorBanner from "@/components/ErrorBanner";
import ToastContainer, { ToastMessage } from "@/components/Toast";
import SavedDatasetsModal from "@/components/SavedDatasetsModal";
import { GenerateResult } from "@/lib/schema";
import { exportToExcel } from "@/lib/excel";

const EXAMPLE_QUERIES = [
  "Fortune 500 Top 20",
  "Top 10 largest countries by population",
  "5 biggest banks in India",
  "Top 30 cricketers in the world",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dataset, setDataset] = useState<GenerateResult | null>(null);
  const [sourceBadge, setSourceBadge] = useState<string>("AI Generation");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSelectExample = (example: string) => {
    setQuery(example);
    setErrorMessage("");
  };

  const handleOptimizeQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading || isOptimizing) return;

    if (trimmedQuery.length < 3) {
      setErrorMessage("Please enter at least 3 characters to optimize.");
      return;
    }

    setIsOptimizing(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/optimize-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to optimize question.");
      }

      if (data.alreadyOptimized) {
        addToast("info", "Query is already concise and search-optimized!");
      } else if (data.optimizedQuery) {
        setQuery(data.optimizedQuery);
        addToast("success", `Question optimized for fast search: "${data.optimizedQuery}"`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        addToast("error", err.message);
      } else {
        addToast("error", "Failed to optimize question.");
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading) return;

    if (trimmedQuery.length < 3) {
      setErrorMessage("Please enter at least 3 characters.");
      return;
    }

    setIsLoading(true);
    setIsSaved(false);
    setErrorMessage("");

    // Create client abort controller with 34-second timeout budget
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 34000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unable to parse server response. The gateway may have timed out.");
      }

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to generate data.");
      }

      setDataset(data);
      if (data.fromDatabase) {
        setSourceBadge("Loaded from database");
        setIsSaved(true);
        addToast("info", "Loaded from database");
      } else if (data.cached) {
        setSourceBadge("From cache");
        addToast("success", "Data generated (from cache)");
      } else {
        setSourceBadge(data.model || "Gemini Flash");
        addToast("success", "Data generated");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        setErrorMessage(
          "The AI took too long. Try again, ask for fewer rows, or click Load Saved Data."
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!dataset || isSaving || isSaved) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: dataset.query,
          note: dataset.note,
          columns: dataset.columns,
          rows: dataset.rows,
          model: dataset.model,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to save dataset.");
      }

      setIsSaved(true);
      addToast("success", "Saved to database");
    } catch (err: unknown) {
      if (err instanceof Error) {
        addToast("error", err.message);
      } else {
        addToast("error", "Could not reach the database.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!dataset) return;
    try {
      await exportToExcel({
        query: dataset.query,
        note: dataset.note,
        columns: dataset.columns,
        rows: dataset.rows,
        model: dataset.model,
      });
      addToast("success", "Excel downloaded");
    } catch (err) {
      console.error(err);
      addToast("error", "Failed to export Excel file");
    }
  };

  const handleLoadSavedDataset = (loadedDataset: GenerateResult) => {
    setDataset(loadedDataset);
    setQuery(loadedDataset.query);
    setSourceBadge("Loaded from database");
    setIsSaved(true);
    addToast("info", "Loaded saved dataset");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Saved Datasets Modal */}
      <SavedDatasetsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadDataset={handleLoadSavedDataset}
        onDatasetDeleted={() => addToast("info", "Dataset deleted")}
        currentQuery={dataset?.query}
      />

      {/* Header */}
      <header className="mb-8 text-center sm:text-left border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI Data Fetch & Export Tool
            </h1>
            <p className="text-sm text-slate-600">
              Query any structured dataset, view dynamic tables, export to Excel, and persist to database.
            </p>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />

      {/* Request Area */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="query-input" className="block text-sm font-semibold text-slate-700">
                What data do you want to generate?
              </label>
              <span className={`text-xs ${query.length > 180 ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                {query.length} / 200
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id="query-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 200))}
                placeholder="e.g. Fortune 500 Top 20"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 text-sm sm:text-base transition"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Example Chips & Generate Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Examples:</span>
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleSelectExample(example)}
                  disabled={isLoading}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition font-medium border border-slate-200"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleOptimizeQuery}
                disabled={isLoading || isOptimizing || !query.trim()}
                title="Optimize question to speed up search"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-amber-900 border border-amber-300 text-sm font-semibold rounded-lg shadow-xs transition"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>Optimize Question</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isLoading || isOptimizing || !query.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Action Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-100/70 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={!dataset || isLoading || isSaving || isSaved}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded shadow-xs transition ${
              isSaved
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:bg-white disabled:cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Saving...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved to Database</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Save to Database</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={!dataset || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 disabled:text-slate-400 text-xs font-semibold rounded shadow-xs hover:bg-slate-50 disabled:bg-white disabled:cursor-not-allowed transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded shadow-xs transition disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Load Saved Data</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      {isLoading ? (
        <TableSkeleton />
      ) : dataset ? (
        <DataTable
          query={dataset.query}
          note={dataset.note}
          columns={dataset.columns}
          rows={dataset.rows}
          sourceBadge={sourceBadge}
        />
      ) : (
        <main className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            No data generated yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Type a request above like &quot;Fortune 500 Top 20&quot; or choose an example chip, then click <strong>Generate Data</strong>.
          </p>
        </main>
      )}
    </div>
  );
}
