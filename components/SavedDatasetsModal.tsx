"use client";

import { useEffect, useState } from "react";
import { X, Trash2, ArrowRight, Loader2, Database, AlertCircle, Check } from "lucide-react";
import { GenerateResult } from "@/lib/schema";

interface DatasetSummary {
  id: number;
  query: string;
  rowCount: number;
  model: string;
  createdAt: string;
}

interface SavedDatasetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDataset: (dataset: GenerateResult) => void;
  onDatasetDeleted: () => void;
  currentQuery?: string;
}

export default function SavedDatasetsModal({
  isOpen,
  onClose,
  onLoadDataset,
  onDatasetDeleted,
  currentQuery,
}: SavedDatasetsModalProps) {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchDatasets();
    }
  }, [isOpen]);

  const fetchDatasets = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/datasets");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Could not load saved datasets.");
      }
      setDatasets(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load datasets.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (id: number) => {
    setLoadingId(id);
    setError("");
    try {
      const res = await fetch(`/api/datasets/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load selected dataset.");
      }

      onLoadDataset({
        query: data.query,
        note: data.note,
        columns: data.columns,
        rows: data.rows,
        model: data.model,
        cached: false,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved dataset?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete dataset.");
      }
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      onDatasetDeleted();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  const isRecentAlreadyLoaded =
    datasets.length > 0 &&
    Boolean(currentQuery) &&
    datasets[0].query.trim().toLowerCase() === currentQuery?.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Saved Datasets</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm">Fetching saved datasets from database...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No saved datasets found</p>
              <p className="text-xs text-slate-400 mt-1">
                Generate data first, then click &quot;Save to Database&quot; to store it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick action banner */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-600 font-medium">Quick action:</span>
                {isRecentAlreadyLoaded ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded">
                    <Check className="w-3.5 h-3.5" />
                    <span>Most recent ({datasets[0].query}) is already displayed</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(datasets[0].id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition"
                  >
                    <span>Load Most Recent ({datasets[0].query})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Datasets list */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {datasets.map((item) => {
                  const isCurrentItemLoaded =
                    Boolean(currentQuery) &&
                    item.query.trim().toLowerCase() === currentQuery?.trim().toLowerCase();

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isCurrentItemLoaded && handleSelect(item.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 transition group ${
                        isCurrentItemLoaded
                          ? "bg-emerald-50/40 cursor-default"
                          : "hover:bg-blue-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition">
                            {item.query}
                          </h4>
                          {isCurrentItemLoaded && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>{item.rowCount} rows</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                          title="Delete dataset"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>

                        {isCurrentItemLoaded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 rounded">
                            <Check className="w-3.5 h-3.5" />
                            <span>Displayed</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingId === item.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white rounded transition"
                          >
                            {loadingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Load</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
