"use client";

import { useState, useRef } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import DataTable from "@/components/DataTable";
import AstralLoadingScreen, { LoadingPhase } from "@/components/AstralLoadingScreen";
import SnapshotFlyer from "@/components/SnapshotFlyer";
import ErrorBanner from "@/components/ErrorBanner";
import ToastContainer, { ToastMessage } from "@/components/Toast";
import SavedDatasetsModal from "@/components/SavedDatasetsModal";
import AstralStarfield from "@/components/AstralStarfield";
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
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("init");
  const [showFlare, setShowFlare] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dataset, setDataset] = useState<GenerateResult | null>(null);
  const [sourceBadge, setSourceBadge] = useState<string>("AI Generation");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Snapshot & Warp States
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isVaultPulsing, setIsVaultPulsing] = useState(false);
  const [isAnimatingSnapshot, setIsAnimatingSnapshot] = useState(false);
  const [snapshotData, setSnapshotData] = useState<{
    type: "save" | "download";
    imageUrl: string | null;
    startRect: DOMRect;
    targetRect: { x: number; y: number };
  } | null>(null);
  const [isWarpingBack, setIsWarpingBack] = useState(false);
  const [isHyperspaceStreak, setIsHyperspaceStreak] = useState(false);
  const [isReturningToChat, setIsReturningToChat] = useState(false);

  const vaultBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keystroke & reactive starfield tracking
  const [keystrokeTime, setKeystrokeTime] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(0);
  const keystrokesRef = useRef<number[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingSaveRef = useRef<Promise<{ success: boolean; errorMsg?: string }> | null>(null);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 200);
    setQuery(val);

    // Track typing speed for reactive starfield ripples & hue shifting
    const now = Date.now();
    setKeystrokeTime(now);
    keystrokesRef.current.push(now);
    keystrokesRef.current = keystrokesRef.current.filter((t) => now - t <= 1500);
    const speed = Math.min(keystrokesRef.current.length / 7, 1);
    setTypingSpeed(speed);
  };

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
    setLoadingPhase("init");
    setDataset(null);
    setIsSaved(false);
    setErrorMessage("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Step 1: Request initial batch (columns, note, and first ~15 rows)
      setLoadingPhase("schema");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery, batch: "initial" }),
        signal: controller.signal,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unable to parse server response. The gateway may have timed out.");
      }

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to generate data.");
      }

      if (data.fromDatabase) {
        setLoadingPhase("finalizing");
        await new Promise((resolve) => setTimeout(resolve, 420));
        setSourceBadge("Loaded from database");
        setIsSaved(true);
        setDataset(data);
        addToast("info", "Loaded from database");
        return;
      } else if (data.cached) {
        setLoadingPhase("finalizing");
        await new Promise((resolve) => setTimeout(resolve, 420));
        setSourceBadge("From cache");
        setDataset(data);
        addToast("success", "Data loaded (from cache)");
        return;
      } else {
        setSourceBadge(data.model || "Gemini Flash");
      }

      setLoadingPhase("fetching");

      // Step 2: If there are remaining rows, fetch continuation batch seamlessly in the background
      let finalDataset = data;

      if (data.hasMore && data.rows && data.rows.length < (data.targetTotal || 25)) {
        setLoadingPhase("continuation");
        // Extract primary names from first or second column to avoid duplicates
        const entityCol = data.columns[1] || data.columns[0];
        const previousItems = data.rows.map((r: any) => String(r[entityCol] || Object.values(r)[0]));

        try {
          const res2 = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: trimmedQuery,
              batch: "continuation",
              columns: data.columns,
              note: data.note,
              existingRows: data.rows,
              existingRowsCount: data.rows.length,
              previousItems,
              targetTotal: data.targetTotal || 25,
            }),
            signal: controller.signal,
          });

          if (res2.ok) {
            const contData = await res2.json();
            if (contData.rows && contData.rows.length > 0) {
              finalDataset = {
                ...data,
                rows: [...data.rows, ...contData.rows],
                hasMore: false,
              };
            }
          }
        } catch (contErr) {
          console.warn("Continuation batch failed, using initial batch:", contErr);
          finalDataset = {
            ...data,
            hasMore: false,
          };
        }
      }

      // Exit warp with lens-flare flash and render complete table
      setLoadingPhase("finalizing");
      // Allow progress bar to smoothly reach 100% and show Phase 05 synthesis
      await new Promise((resolve) => setTimeout(resolve, 480));
      setShowFlare(true);
      setTimeout(() => setShowFlare(false), 450);
      setDataset(finalDataset);
      addToast("success", `Data generated (${finalDataset.rows?.length || 0} rows)`);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setErrorMessage("Generation was cancelled.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const captureTableSnapshot = async (): Promise<string | null> => {
    try {
      const tableEl = document.getElementById("astral-data-table");
      if (!tableEl) return null;
      return await toPng(tableEl, { cacheBust: true, pixelRatio: 1 });
    } catch (e) {
      console.warn("Snapshot capture fallback to card:", e);
      return null;
    }
  };

  const handleSaveToDatabase = async () => {
    if (!dataset || isSaving || isSaved || isAnimatingSnapshot) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setIsSaving(true);

    // Fire actual database commit API and track its completion
    const savePromise = (async () => {
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
          return { success: false, errorMsg: data?.error?.message || "Failed to save dataset." };
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Connection timeout. Please retry.";
        return { success: false, errorMsg: msg };
      }
    })();

    pendingSaveRef.current = savePromise;

    if (prefersReducedMotion) {
      const result = await savePromise;
      setIsSaving(false);
      if (result.success) {
        setIsSaved(true);
        addToast("success", "Committed to Nexus database");
      } else {
        setIsSaved(false);
        addToast("error", result.errorMsg || "Could not reach database. Please retry.");
      }
      return;
    }

    // Trigger Camera-Shutter Flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 140);

    setIsAnimatingSnapshot(true);
    const imgUrl = await captureTableSnapshot();
    const tableEl = document.getElementById("astral-data-table");
    const startRect = tableEl?.getBoundingClientRect() || new DOMRect(40, 140, 800, 400);

    // Dynamic Target: Compute Vault Button position using getBoundingClientRect
    const vaultRect = vaultBtnRef.current?.getBoundingClientRect();
    const targetRect = vaultRect
      ? { x: vaultRect.left + vaultRect.width / 2, y: vaultRect.top + vaultRect.height / 2 }
      : { x: window.innerWidth - 110, y: 30 };

    setSnapshotData({
      type: "save",
      imageUrl: imgUrl,
      startRect,
      targetRect,
    });
  };

  const handleSaveAnimationComplete = async () => {
    setSnapshotData(null);
    setIsAnimatingSnapshot(false);

    // Await the actual database save response
    const saveResult = pendingSaveRef.current ? await pendingSaveRef.current : { success: false };
    setIsSaving(false);

    if (saveResult.success) {
      // ONLY change save icon to tick if table was genuinely saved in DB!
      setIsSaved(true);
      setIsVaultPulsing(true);
      setTimeout(() => setIsVaultPulsing(false), 900);
      addToast("success", "Committed to Nexus database");
    } else {
      // Do NOT tick the save button on failure - leave as save icon so user can retry!
      setIsSaved(false);
      addToast("error", saveResult.errorMsg || "Could not reach database. Please retry.");
    }
  };

  const handleDownloadExcel = async () => {
    if (!dataset || isAnimatingSnapshot) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      try {
        await exportToExcel({
          query: dataset.query,
          note: dataset.note,
          columns: dataset.columns,
          rows: dataset.rows,
          model: dataset.model,
        });
        addToast("success", "Excel materialized");
      } catch {
        addToast("error", "Failed to export Excel file");
      }
      return;
    }

    // Camera-Shutter Flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 140);

    setIsAnimatingSnapshot(true);
    const imgUrl = await captureTableSnapshot();
    const tableEl = document.getElementById("astral-data-table");
    const startRect = tableEl?.getBoundingClientRect() || new DOMRect(40, 140, 800, 400);

    // Target: Top-right corner as requested ("movet to top rightt not left")
    const targetRect = { x: window.innerWidth - 35, y: 25 };

    setSnapshotData({
      type: "download",
      imageUrl: imgUrl,
      startRect,
      targetRect,
    });
  };

  const handleDownloadAnimationComplete = async () => {
    setSnapshotData(null);
    setIsAnimatingSnapshot(false);

    // Trigger Excel download AFTER snapshot arrives at top-right destination
    if (dataset) {
      try {
        await exportToExcel({
          query: dataset.query,
          note: dataset.note,
          columns: dataset.columns,
          rows: dataset.rows,
          model: dataset.model,
        });
        addToast("success", "Excel materialized");
      } catch {
        addToast("error", "Failed to export Excel file");
      }
    }
  };

  const handleResetToChat = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDataset(null);
      setQuery("");
      inputRef.current?.focus();
      return;
    }

    // Cinematic Seamless Return Back to Chat:
    // 1. Table slides down off the bottom edge
    // 2. Background stars stream top-to-bottom (up to down)
    // 3. Chat portal seamlessly fades into the center (no drop from top)
    setIsReturningToChat(true);
    setIsWarpingBack(true);
    setIsHyperspaceStreak(true);

    setTimeout(() => {
      setDataset(null);
      setQuery("");
      setIsWarpingBack(false);

      // Keep stars streaming down gently while chat portal seamlessly fades in
      setTimeout(() => {
        setIsHyperspaceStreak(false);
      }, 350);

      setTimeout(() => {
        setIsReturningToChat(false);
        inputRef.current?.focus();
      }, 550);
    }, 420);
  };

  const handleLoadSavedDataset = (loadedDataset: GenerateResult) => {
    setDataset(loadedDataset);
    setQuery(loadedDataset.query);
    setSourceBadge("Loaded from database");
    setIsSaved(true);
    addToast("info", "Loaded saved dataset");
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden relative bg-black text-slate-100 flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Background 2D Starfield (twinkle, parallax drift, keystroke shockwaves, typing speed hue shift, hyperspace warp) */}
      <AstralStarfield
        keystrokeTime={keystrokeTime}
        typingSpeed={typingSpeed}
        isWarping={isLoading || isHyperspaceStreak}
        warpDirection={isReturningToChat ? "down" : "up"}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Camera-Shutter Flash Effect */}
      {shutterFlash && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-white animate-shutter-flash" />
      )}

      {/* Exit Lens-Flare Flash Effect */}
      {showFlare && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-white/40 backdrop-blur-xs animate-lens-flare" />
      )}

      {/* Kinetic Snapshot Flyer (Save into Nexus or Materialize into Top-Right Browser Corner) */}
      {snapshotData && (
        <SnapshotFlyer
          type={snapshotData.type}
          imageUrl={snapshotData.imageUrl}
          startRect={snapshotData.startRect}
          targetRect={snapshotData.targetRect}
          fallbackTitle={dataset?.query || "Astral Dataset"}
          onComplete={
            snapshotData.type === "save"
              ? handleSaveAnimationComplete
              : handleDownloadAnimationComplete
          }
        />
      )}

      {/* Saved Datasets Modal */}
      <SavedDatasetsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadDataset={handleLoadSavedDataset}
        onDatasetDeleted={() => addToast("info", "Dataset deleted")}
        currentQuery={dataset?.query}
      />

      {/* Top Astral Header Bar - Stealth & Cold Glass */}
      <header className="relative z-20 w-full px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between shrink-0">
        {dataset ? (
          <button
            type="button"
            onClick={handleResetToChat}
            disabled={isLoading || isAnimatingSnapshot || isWarpingBack}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/20 text-[11px] sm:text-xs font-mono font-semibold tracking-wider text-zinc-300 hover:text-white transition group backdrop-blur-md shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-white" />
            <span className="hidden xs:inline">RETURN TO CHAT</span>
            <span className="xs:hidden">CHAT</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
            <span className="text-[11px] sm:text-xs font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase font-bold text-white flex items-center gap-1">
              <span className="text-zinc-500 font-normal">[</span>
              <span className="text-white font-extrabold">DATA ETHER</span>
              <span className="text-zinc-500 font-normal">]</span>
            </span>
          </div>
        )}

        {/* Glossy Glass Vault Button with Custom Safe Dial Icon */}
        <button
          ref={vaultBtnRef}
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl backdrop-blur-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 border-t-white/30 text-zinc-300 hover:text-white transition-all duration-200 text-[11px] sm:text-xs font-mono tracking-wider shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.5)] ${
            isVaultPulsing
              ? "border-white ring-2 ring-white/30 scale-105 shadow-[0_0_25px_rgba(255,255,255,0.35)] text-white"
              : ""
          }`}
          title="Open Saved Datasets Vault"
        >
          <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 8.5v1M12 14.5v1M8.5 12h1M14.5 12h1" />
          </svg>
          <span className="hidden sm:inline font-semibold">VAULT</span>
        </button>
      </header>

      {/* Main Container - Always Centered Vertically in Middle of Viewport */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center mx-auto w-full min-h-0 px-2 sm:px-4 py-1 sm:py-2 overflow-hidden ${
        dataset ? "max-w-[98vw] xl:max-w-[1650px]" : "max-w-6xl"
      }`}>
        {/* Error Banner */}
        <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />

        {/* Multi-Stage Choreographed Transitions */}
        <AnimatePresence mode="wait">
          {/* Stage 1: The Galactic Portal (The Chat Stage) */}
          {!dataset && !isLoading && (
            <motion.div
              key="chat-portal"
              initial={{
                scale: 0.98,
                opacity: 0,
                y: 0,
                filter: isReturningToChat ? "blur(8px)" : "blur(0px)",
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
              }}
              exit={{
                y: -750,
                opacity: 0,
                filter: "blur(12px)",
                transition: { duration: 0.52, ease: [0.65, 0, 0.35, 1] },
              }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center my-auto transition-all duration-300 relative"
            >
              {/* Cinematic Editorial Light Leaks & Glares (Reflecting off liquid glass backdrop) */}
              <div className="absolute -top-24 right-4 w-72 h-72 rounded-full bg-gradient-to-br from-amber-500/18 via-orange-500/8 to-transparent blur-[80px] pointer-events-none transform -rotate-12" />
              <div className="absolute -bottom-20 left-4 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-500/14 via-indigo-500/6 to-transparent blur-[85px] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-36 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent blur-3xl pointer-events-none transform -rotate-3" />

              {/* Phonk / Dark Astral Monolithic Typographic Headline */}
              <div className="text-center mb-5 sm:mb-8 space-y-2 sm:space-y-3 relative z-10 px-2">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-2xl bg-white/[0.06] border border-white/20 border-t-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_25px_rgba(0,0,0,0.6)] text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                  AUTONOMOUS DATA PROTOCOL
                </div>
                <h1 className="text-4xl xs:text-5xl sm:text-7xl font-black tracking-tight text-white uppercase drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
                  DATA ETHER
                </h1>
                <p className="text-[11px] sm:text-sm font-mono uppercase tracking-[0.16em] sm:tracking-[0.2em] text-zinc-400 max-w-lg mx-auto">
                  EXTRACT STRUCTURED TABULAR INTELLIGENCE FROM THE VOID
                </p>
              </div>

              {/* Liquid Glossy Glassmorphism Input Bar */}
              <form onSubmit={handleGenerate} className="w-full relative z-10">
                <div className="relative group w-full rounded-2xl backdrop-blur-2xl bg-white/[0.05] border border-white/20 border-t-white/40 border-l-white/25 focus-within:border-white/50 focus-within:ring-1 focus-within:ring-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_0_20px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.85)] transition-all duration-300 overflow-hidden">
                  {/* Liquid Glass Specular Top Sheen */}
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/[0.1] to-transparent pointer-events-none rounded-t-2xl" />

                  <input
                    ref={inputRef}
                    id="query-input"
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Enter data query (e.g. Fortune 500 Top 20)..."
                    disabled={isLoading}
                    autoComplete="off"
                    className="w-full pl-4 sm:pl-5 pr-20 sm:pr-24 py-3 sm:py-4 bg-transparent text-white placeholder-zinc-500 font-sans text-sm sm:text-base outline-none transition relative z-10"
                  />

                  {/* Editorial Action Controls */}
                  <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
                    {/* Optimize Question Button: Editorial Asterisk Glyph */}
                    <button
                      type="button"
                      onClick={handleOptimizeQuery}
                      disabled={isLoading || isOptimizing || !query.trim()}
                      title="Optimize question"
                      className="p-1.5 sm:p-2 rounded-xl backdrop-blur-md bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white transition disabled:opacity-30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                    >
                      {isOptimizing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
                        </svg>
                      )}
                    </button>

                    {/* High-End Circular Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading || isOptimizing || !query.trim()}
                      title="Generate data"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.35)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group/btn font-bold"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] transform transition-transform group-hover/btn:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Character Count */}
                <div className="flex justify-end mt-1.5 sm:mt-2 px-2">
                  <span className={`text-[10px] sm:text-[11px] font-mono ${query.length > 180 ? "text-amber-400" : "text-zinc-500"}`}>
                    {query.length} / 200
                  </span>
                </div>
              </form>

              {/* Quick Example Chips - Glossy Glassmorphism Padded Cards */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 mt-3 sm:mt-6 max-w-xl mx-auto relative z-10 px-1">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleSelectExample(example)}
                    disabled={isLoading}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/15 border-t-white/25 hover:border-white/35 text-[11px] sm:text-xs font-mono text-zinc-300 hover:text-white transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_6px_18px_rgba(0,0,0,0.5)]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading State: Appears from below and stops at the center */}
          {isLoading && (
            <motion.div
              key="loading-screen"
              initial={{ y: 550, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{
                y: -650,
                opacity: 0,
                filter: "blur(10px)",
                transition: { duration: 0.48, ease: [0.65, 0, 0.35, 1] },
              }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl mx-auto my-auto"
            >
              <AstralLoadingScreen query={query} phase={loadingPhase} />
            </motion.div>
          )}

          {/* Stage 3: Table Arrival State - Rises seamlessly from below into the middle */}
          {dataset && !isLoading && (
            <motion.div
              key="table-arrival"
              initial={{ y: 550, opacity: 0, scale: 0.98 }}
              animate={
                isWarpingBack
                  ? {
                      y: 850,
                      scale: 0.94,
                      filter: "blur(14px)",
                      opacity: 0,
                    }
                  : {
                      scale: 1,
                      filter: "blur(0px)",
                      opacity: 1,
                      y: 0,
                    }
              }
              exit={{
                opacity: 0,
                y: 850,
                filter: "blur(14px)",
                transition: { duration: 0.44, ease: [0.65, 0, 0.35, 1] },
              }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="w-full my-auto flex flex-col"
            >
            <DataTable
              key={`${dataset.query}-${dataset.rows.length}`}
              query={dataset.query}
              note={dataset.note}
              columns={dataset.columns}
              rows={dataset.rows}
              sourceBadge={sourceBadge}
              onSaveToDatabase={handleSaveToDatabase}
              isSaving={isSaving}
              isSaved={isSaved}
              onDownloadExcel={handleDownloadExcel}
              isAnimatingSnapshot={isAnimatingSnapshot}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>

      {/* Minimal Astral Footer - Only on Chat / Search stage to keep table view strictly non-scrollable */}
      {!dataset && (
        <footer className="relative z-20 w-full px-4 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">
          <span>AI TABULAR EXTRACTION</span>
          <span>ASTRAL EDITION</span>
        </footer>
      )}
    </div>
  );
}
