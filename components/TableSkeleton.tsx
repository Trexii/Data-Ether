"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function TableSkeleton() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Show polite status hint after 4 seconds
    const timer = setTimeout(() => {
      setShowHint(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-4 w-72 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-6 w-28 bg-slate-200 rounded-md"></div>
      </div>

      {/* Progress status notification */}
      <div className="flex items-center gap-2.5 text-sm text-blue-600 bg-blue-50/70 p-3 rounded-lg border border-blue-100">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>
          {showHint
            ? "Generating, this usually takes 5 to 15 seconds..."
            : "Contacting AI model to extract structured data..."}
        </span>
      </div>

      {/* Skeleton Rows */}
      <div className="space-y-3 pt-2">
        <div className="h-10 bg-slate-100 rounded-lg"></div>
        <div className="h-9 bg-slate-50 rounded-lg"></div>
        <div className="h-9 bg-slate-100/60 rounded-lg"></div>
        <div className="h-9 bg-slate-50 rounded-lg"></div>
        <div className="h-9 bg-slate-100/60 rounded-lg"></div>
      </div>
    </div>
  );
}
