"use client";

import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-start justify-between gap-3 shadow-lg backdrop-blur-md animate-fade-in max-w-2xl w-full mx-auto">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-red-300">Request Error</h4>
          <p className="text-sm text-red-200/90 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
