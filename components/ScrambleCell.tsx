"use client";

import { useEffect, useState, useRef } from "react";

interface ScrambleCellProps {
  value: string | number;
  shouldAnimate: boolean;
  delayMs?: number;
}

const GLYPHS = "01#$*+~<>[]{}!=%&@ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function ScrambleCell({
  value,
  shouldAnimate,
  delayMs = 0,
}: ScrambleCellProps) {
  const targetText = value !== undefined && value !== null ? String(value) : "N/A";
  const [displayText, setDisplayText] = useState<string>(shouldAnimate ? "" : targetText);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // If not animating, reduced-motion enabled, or empty value, render text immediately
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!shouldAnimate || prefersReducedMotion || targetText.length === 0) {
      setDisplayText(targetText);
      return;
    }

    let isMounted = true;

    timerRef.current = setTimeout(() => {
      let iteration = 0;
      const maxIterations = Math.min(targetText.length * 3, 18);
      const startTime = performance.now();
      const duration = 280; // ms for scramble

      const scramble = (currentTime: number) => {
        if (!isMounted) return;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const revealedCount = Math.floor(progress * targetText.length);

        const current = targetText
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < revealedCount) {
              return char;
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");

        setDisplayText(current);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(scramble);
        } else {
          setDisplayText(targetText);
        }
      };

      frameRef.current = requestAnimationFrame(scramble);
    }, delayMs);

    return () => {
      isMounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetText, shouldAnimate, delayMs]);

  return (
    <span className="font-mono text-xs sm:text-sm select-text text-slate-200">
      {displayText || targetText}
    </span>
  );
}
