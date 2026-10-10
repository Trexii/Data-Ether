"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ArrowRight, Loader2, AlertCircle, Check } from "lucide-react";
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

  const [datasetToDelete, setDatasetToDelete] = useState<DatasetSummary | null>(null);

  const confirmDelete = async () => {
    if (!datasetToDelete) return;
    const id = datasetToDelete.id;
    setDeletingId(id);
    setDatasetToDelete(null);
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

  const isRecentAlreadyLoaded =
    datasets.length > 0 &&
    Boolean(currentQuery) &&
    datasets[0].query.trim().toLowerCase() === currentQuery?.trim().toLowerCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
          {/* Subtle reduced backdrop blur so stars remain crisp */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2.5px]"
          />

          {/* Obsidian Frosted Vault Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-black/85 border border-white/15 border-t-white/35 rounded-xl sm:rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] backdrop-blur-2xl w-full max-w-xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden text-zinc-100"
          >
            {/* Specular Liquid Glare Bar */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Custom Vault Safe Dial Icon */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="12" r="3.5" />
                    <path d="M12 8.5v1M12 14.5v1M8.5 12h1M14.5 12h1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono font-bold text-white text-[11px] sm:text-xs tracking-[0.2em] uppercase">
                    [ NEXUS VAULT ]
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400">PERSISTED DATASET ARCHIVE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 sm:space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">Querying Nexus DB...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-300">Vault Empty</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                    Generate data and click &ldquo;Commit to Nexus&rdquo; to store snapshots in the database.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Quick action banner */}
                  <div className="flex items-center justify-between bg-white/[0.03] p-2.5 sm:p-3 rounded-xl border border-white/10 gap-2">
                    <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-wider shrink-0">Latest Snapshot:</span>
                    {isRecentAlreadyLoaded ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-white/10 border border-white/25 text-white text-[11px] sm:text-xs font-mono font-semibold rounded-lg truncate">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">Active ({datasets[0].query.slice(0, 16)}...)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelect(datasets[0].id)}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white text-zinc-200 hover:text-black text-[11px] sm:text-xs font-mono font-semibold rounded-lg border border-white/20 transition shrink-0 touch-manipulation"
                      >
                        <span>Load Most Recent</span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Datasets list */}
                  <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
                    {datasets.map((item) => {
                      const isCurrentItemLoaded =
                        Boolean(currentQuery) &&
                        item.query.trim().toLowerCase() === currentQuery?.trim().toLowerCase();

                      return (
                        <div
                          key={item.id}
                          onClick={() => !isCurrentItemLoaded && handleSelect(item.id)}
                          className={`p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 transition group ${isCurrentItemLoaded
                            ? "bg-white/[0.08] cursor-default"
                            : "hover:bg-white/[0.05] cursor-pointer"
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <h4 className="font-semibold text-zinc-200 text-xs sm:text-sm truncate group-hover:text-white transition">
                                {item.query}
                              </h4>
                              {isCurrentItemLoaded && (
                                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-white/15 text-white border border-white/30 shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono text-zinc-400 mt-0.5 sm:mt-1">
                              <span>{item.rowCount} rows</span>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCurrentItemLoaded) return;
                                setDatasetToDelete(item);
                              }}
                              disabled={isCurrentItemLoaded || deletingId === item.id}
                              className={`p-1.5 rounded-lg transition touch-manipulation ${isCurrentItemLoaded
                                ? "text-zinc-600 cursor-not-allowed opacity-30"
                                : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                }`}
                              title={
                                isCurrentItemLoaded
                                  ? "Active dataset cannot be deleted while open on the table"
                                  : "Delete dataset"
                              }
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              )}
                            </button>

                            {isCurrentItemLoaded ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono font-semibold text-white bg-white/15 border border-white/30 rounded-lg">
                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Loaded</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={loadingId === item.id}
                                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono font-semibold text-zinc-300 bg-white/[0.05] border border-white/10 group-hover:bg-white group-hover:text-black rounded-lg transition touch-manipulation"
                              >
                                {loadingId === item.id ? (
                                  <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <span>Load</span>
                                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
            <div className="p-2.5 sm:p-3 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-1 sm:py-1.5 text-xs font-mono font-semibold text-zinc-300 hover:text-white bg-white/[0.05] border border-white/10 rounded-lg hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            {/* Sleek Themed Delete Confirmation Popup (Replaces native browser confirm) */}
            <AnimatePresence>
              {datasetToDelete && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDatasetToDelete(null);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[320px] sm:max-w-sm rounded-2xl bg-zinc-950/95 border border-white/20 border-t-white/40 p-4 sm:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.98)] text-center relative overflow-hidden"
                  >
                    {/* Specular Liquid Glare Bar */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/15 border border-red-500/35 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    </div>

                    <h4 className="text-[11px] sm:text-xs font-bold font-mono tracking-[0.2em] text-white uppercase mb-1">
                      CONFIRM DELETION
                    </h4>

                    <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-2">
                      Are you sure you want to delete this dataset?
                    </p>

                    <p className="text-[10px] sm:text-[11px] font-mono text-zinc-400 truncate px-2.5 py-1 mb-4 sm:mb-5 bg-white/[0.04] rounded-lg border border-white/10">
                      &ldquo;{datasetToDelete.query}&rdquo;
                    </p>

                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDatasetToDelete(null)}
                        className="flex-1 px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[11px] sm:text-xs font-mono font-medium text-zinc-300 hover:text-white transition shadow-sm touch-manipulation"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDelete}
                        className="flex-1 px-3 py-1.5 sm:py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-[11px] sm:text-xs font-mono font-semibold transition shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-400/40 touch-manipulation"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
