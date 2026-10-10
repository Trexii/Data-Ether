"use client";

import { motion } from "framer-motion";

interface SnapshotFlyerProps {
  type: "save" | "download";
  imageUrl: string | null;
  startRect: DOMRect;
  targetRect: { x: number; y: number };
  fallbackTitle: string;
  onComplete: () => void;
}

export default function SnapshotFlyer({
  type,
  imageUrl,
  startRect,
  targetRect,
  fallbackTitle,
  onComplete,
}: SnapshotFlyerProps) {
  const isSave = type === "save";

  const startX = startRect.x;
  const startY = startRect.y;
  const endX = targetRect.x;
  const endY = targetRect.y;

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy) || 1;
  // Perpendicular normal vector to flight path
  const nx = -dy / dist;
  const ny = dx / dist;

  // Wavy sine-wave amplitude
  const waveAmp = 60;

  // 6 waypoints along the wavy trajectory
  const xKeyframes = [
    startX,
    startX + dx * 0.2 + nx * waveAmp,
    startX + dx * 0.45 - nx * (waveAmp * 0.85),
    startX + dx * 0.7 + nx * (waveAmp * 0.6),
    startX + dx * 0.9 - nx * (waveAmp * 0.3),
    endX,
  ];

  const yKeyframes = [
    startY,
    startY + dy * 0.2 + ny * waveAmp,
    startY + dy * 0.45 - ny * (waveAmp * 0.85),
    startY + dy * 0.7 + ny * (waveAmp * 0.6),
    startY + dy * 0.9 - ny * (waveAmp * 0.3),
    endY,
  ];

  const scaleKeyframes = [1, 0.22, 0.2, 0.17, 0.12, 0.03];
  const opacityKeyframes = [1, 1, 0.95, 0.9, 0.75, 0];
  const rotateKeyframes = [0, -14, 15, -10, 8, 0];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Miniaturized Wavy Flying Snapshot Card */}
      <motion.div
        initial={{
          x: startX,
          y: startY,
          width: startRect.width,
          height: Math.min(startRect.height, 460),
          scale: 1,
          opacity: 1,
          rotate: 0,
        }}
        animate={{
          x: xKeyframes,
          y: yKeyframes,
          scale: scaleKeyframes,
          opacity: opacityKeyframes,
          rotate: rotateKeyframes,
        }}
        transition={{
          duration: 1.05,
          ease: "easeInOut",
          times: [0, 0.18, 0.45, 0.72, 0.9, 1],
        }}
        onAnimationComplete={onComplete}
        className="relative rounded-2xl overflow-hidden border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(255,255,255,0.25)] bg-black/90 backdrop-blur-2xl"
        style={{ transformOrigin: "top left" }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Table Snapshot"
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center bg-black/95 text-white border border-white/20">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">
              {isSave ? "COMMITTING TO VAULT" : "DOWNLOADING SPREADSHEET"}
            </span>
            <h4 className="text-base font-bold truncate max-w-xs">{fallbackTitle}</h4>
          </div>
        )}

        {/* Glossy Liquid Glass Specular Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
      </motion.div>

      {/* Radiant Diamond Particle Trail Following the Wave */}
      <motion.div
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{
          x: xKeyframes.map((x) => x + (startRect.width * 0.1)),
          y: yKeyframes.map((y) => y + (startRect.height * 0.08)),
          opacity: [0.9, 0.8, 0.7, 0.5, 0.2, 0],
          scale: [1, 0.8, 0.6, 0.4, 0.2, 0.05],
        }}
        transition={{
          duration: 1.05,
          ease: "easeInOut",
          times: [0, 0.18, 0.45, 0.72, 0.9, 1],
        }}
        className="absolute w-3.5 h-3.5 rounded-full bg-white blur-xs shadow-[0_0_18px_#ffffff]"
      />
    </div>
  );
}
