"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="fixed bottom-10 inset-x-0 mx-auto z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const isError = toast.type === "error";

  // Give error toasts longer reading duration (4800ms vs 3400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, isError ? 4800 : 3400);
    return () => clearTimeout(timer);
  }, [isError]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, scale: 0.96, filter: "blur(6px)" }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto relative overflow-hidden px-5 py-2 rounded-full border backdrop-blur-2xl shadow-[0_20px_45px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.22)] select-none flex items-center justify-center gap-2 whitespace-nowrap min-h-[36px] ${
        isError
          ? "bg-[#0c0607]/95 border-red-500/35 border-t-red-400/60 text-red-200"
          : "bg-[#09090b]/92 border-white/15 border-t-white/35 text-zinc-100"
      }`}
    >
      {/* Specular Liquid Glare Bar */}
      <div
        className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
          isError ? "via-red-400/45" : "via-white/45"
        } to-transparent pointer-events-none`}
      />

      {/* Tiny Status Indicator Dot */}
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isError
            ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
            : "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
        }`}
      />

      {/* Pure Text Toast with High Typography Clarity */}
      <span className="font-mono text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-zinc-100 drop-shadow-sm">
        {toast.message}
      </span>
    </motion.div>
  );
}
