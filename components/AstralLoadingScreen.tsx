"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type LoadingPhase = "init" | "schema" | "fetching" | "continuation" | "finalizing";

interface AstralLoadingScreenProps {
  query?: string;
  phase?: LoadingPhase;
}

const PHASE_DETAILS: Record<LoadingPhase, { step: string; text: string; targetPct: number }> = {
  init: {
    step: "01",
    text: "Materializing schema blueprint from neural void...",
    targetPct: 25,
  },
  schema: {
    step: "02",
    text: "Calibrating column headers & data constraints...",
    targetPct: 50,
  },
  fetching: {
    step: "03",
    text: "Harvesting structured tabular rows from ether...",
    targetPct: 75,
  },
  continuation: {
    step: "04",
    text: "Extracting continuation batch & verifying rows...",
    targetPct: 92,
  },
  finalizing: {
    step: "05",
    text: "Synthesizing finalized spreadsheet matrix...",
    targetPct: 100,
  },
};

export default function AstralLoadingScreen({
  query = "Astral Query",
  phase = "init",
}: AstralLoadingScreenProps) {
  const current = PHASE_DETAILS[phase] || PHASE_DETAILS.init;
  const [displayPct, setDisplayPct] = useState(15);
  const highestPctRef = useRef(15);

  useEffect(() => {
    const target = current.targetPct;

    const interval = setInterval(() => {
      setDisplayPct((prev) => {
        let next = prev;

        if (phase === "finalizing") {
          // Accelerate smoothly to 100%
          const step = Math.max(1, Math.round((100 - prev) * 0.45));
          next = Math.min(100, prev + step);
        } else if (prev < target) {
          // Approach current phase target smoothly
          const step = Math.max(0.8, (target - prev) * 0.22);
          next = Math.min(target, prev + step);
        } else {
          // Slowly creep forward while server responds, without exceeding next milestone
          const ceiling = phase === "continuation" ? 95 : Math.min(96, target + 12);
          if (prev < ceiling) {
            next = Math.min(ceiling, prev + 0.25);
          }
        }

        // Strictly monotonic: percentage must NEVER go backward
        const strictlyForward = Math.max(highestPctRef.current, next);
        highestPctRef.current = strictlyForward;
        return strictlyForward;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [current.targetPct, phase]);

  const currentPhase = current;
  const progressPct = Math.min(100, Math.max(10, Math.round(displayPct)));

  return (
    <div className="relative flex flex-col items-center justify-center py-3 sm:py-6 px-2.5 sm:px-4 z-20 text-center select-none w-full max-w-xl mx-auto">
      {/* Liquid Frosted Glass Materialized Query Card */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative group w-full rounded-xl sm:rounded-2xl backdrop-blur-2xl bg-white/[0.04] border border-white/20 border-t-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_25px_60px_rgba(0,0,0,0.9)] p-4 sm:p-8 overflow-hidden text-left"
      >
        {/* Specular Liquid Glass Top Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none rounded-t-xl sm:rounded-t-2xl" />

        {/* Ambient Scanning Laser Bar */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-1/3 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-75 pointer-events-none"
        />

        {/* Top Protocol Status Line */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/[0.06] border border-white/15 text-[10px] sm:text-[11px] font-mono tracking-[0.16em] sm:tracking-[0.2em] uppercase text-zinc-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
            <span>EXTRACTING DATA</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 tracking-wider sm:tracking-widest uppercase shrink-0">
            DESCENT ACTIVE
          </span>
        </div>

        {/* Materialized Query Display */}
        <div className="mb-4 sm:mb-6">
          <span className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-zinc-500 block mb-1">
            TARGET INQUIRY
          </span>
          <p className="text-base sm:text-xl font-bold text-white tracking-tight break-words drop-shadow-sm font-sans line-clamp-2 sm:line-clamp-none">
            &ldquo;{query}&rdquo;
          </p>
        </div>

        {/* Precision Progress Bar - Strictly monotonic & smooth */}
        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>PHASE {currentPhase.step} / 05</span>
            <span className="font-semibold text-white">{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-white shadow-[0_0_12px_#ffffff] rounded-full transition-all duration-200 ease-out"
            />
          </div>
        </div>

        {/* Cycling Status Step Text */}
        <div className="h-6 sm:h-7 flex items-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentPhase.step}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-[11px] sm:text-sm font-mono text-zinc-300 tracking-wide flex items-center gap-1.5 sm:gap-2 truncate"
            >
              <span className="text-zinc-500">&gt;</span>
              <span className="truncate">{currentPhase.text}</span>
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
