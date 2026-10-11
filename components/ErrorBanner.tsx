"use client";

import { AlertCircle, AlertTriangle, RotateCcw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  if (!message) return null;

  const isWarning =
    message.toLowerCase().includes("at least 3") ||
    message.toLowerCase().includes("context") ||
    message.toLowerCase().includes("optimize");

  const canRetry =
    Boolean(onRetry) &&
    (message.toLowerCase().includes("timed out") ||
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("retry") ||
      message.toLowerCase().includes("server") ||
      message.toLowerCase().includes("unavailable") ||
      message.toLowerCase().includes("failed"));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden mb-4 p-3.5 sm:p-4 rounded-2xl backdrop-blur-2xl border shadow-[0_20px_45px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.18)] flex items-start justify-between gap-3 max-w-2xl w-full mx-auto z-30 ${
          isWarning
            ? "bg-[#0c0a06]/92 border-amber-500/35 border-t-amber-400/50 text-amber-200"
            : "bg-[#0c0607]/92 border-red-500/35 border-t-red-400/50 text-red-200"
        }`}
      >
        {/* Specular Liquid Top Sheen */}
        <div
          className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
            isWarning ? "via-amber-400/40" : "via-red-400/40"
          } to-transparent pointer-events-none`}
        />

        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border backdrop-blur-md ${
              isWarning
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono uppercase tracking-[0.2em] font-semibold ${
                  isWarning ? "text-amber-400" : "text-red-400"
                }`}
              >
                {isWarning ? "[ NOTICE ]" : "[ SYSTEM PROTOCOL NOTICE ]"}
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-zinc-200/90 mt-1 leading-relaxed break-words font-sans">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-[11px] font-mono uppercase tracking-wider text-white transition active:scale-95 flex items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
            >
              <RotateCcw className="w-3 h-3 text-zinc-300" />
              <span>Retry</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
