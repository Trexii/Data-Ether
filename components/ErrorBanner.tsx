"use client";

import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-red-900">Request Error</h4>
          <p className="text-sm text-red-700 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
