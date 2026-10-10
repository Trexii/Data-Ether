"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgStyles =
    toast.type === "success"
      ? "bg-slate-900 text-white border-slate-800"
      : toast.type === "error"
      ? "bg-red-900 text-white border-red-800"
      : "bg-slate-800 text-white border-slate-700";

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition transform translate-y-0 ${bgStyles}`}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
        {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
        <span>{toast.message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-0.5 rounded transition"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
