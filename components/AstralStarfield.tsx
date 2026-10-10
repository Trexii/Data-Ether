"use client";

import { useEffect, useRef } from "react";

interface AstralStarfieldProps {
  keystrokeTime?: number;
  typingSpeed?: number; // Keystrokes per minute or relative speed (0 to 1)
  isWarping?: boolean; // For Phase 2 loading hyperspace warp
  warpDirection?: "up" | "down"; // Direction of star streaming ("up" for generation, "down" for return to chat)
}

interface Star {
  x: number;
  y: number;
  z: number; // 1 (far), 2 (mid), 3 (near)
  baseRadius: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  vx: number;
  vy: number;
  warpDist: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  decay: number;
}

export default function AstralStarfield({
  keystrokeTime = 0,
  typingSpeed = 0,
  isWarping = false,
  warpDirection = "up",
}: AstralStarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const hueRef = useRef<number>(270);
  const targetHueRef = useRef<number>(270);
  const descendSpeedRef = useRef<number>(0);

  // Mouse parallax state with smooth damped interpolation
  const mouseRef = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Trigger shockwave ripple on keystroke (cold monochrome astral energy)
  useEffect(() => {
    if (keystrokeTime <= 0 || isWarping) return;

    if (canvasRef.current) {
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height * 0.45;
      ripplesRef.current.push({
        x: cx,
        y: cy,
        radius: 12,
        maxRadius: Math.max(cx, cy) * 0.85,
        strength: 6 + typingSpeed * 8,
        decay: 0.965,
      });

      if (ripplesRef.current.length > 5) {
        ripplesRef.current.shift();
      }
    }
  }, [keystrokeTime, typingSpeed, isWarping]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalized from -1 to 1 from screen center
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const initStars = () => {
      const count = 230;
      const stars: Star[] = [];
      const w = canvas.width || window.innerWidth;
      const h = canvas.height || window.innerHeight;

      for (let i = 0; i < count; i++) {
        const layer = Math.random() < 0.55 ? 1 : Math.random() < 0.85 ? 2 : 3;
        const baseRadius = layer === 1 ? 0.75 : layer === 2 ? 1.4 : 2.2;
        const baseAlpha = layer === 1 ? 0.35 : layer === 2 ? 0.65 : 0.95;

        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: layer,
          baseRadius,
          radius: baseRadius,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: 0.012 + Math.random() * 0.025,
          twinkleOffset: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.12 * layer,
          vy: (Math.random() - 0.5) * 0.12 * layer,
          warpDist: Math.random() * Math.max(w, h),
        });
      }
      starsRef.current = stars;
    };

    resize();
    window.addEventListener("resize", resize);

    if (prefersReducedMotion) {
      ctx.fillStyle = "#060814";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      starsRef.current.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 225, 255, ${s.baseAlpha})`;
        ctx.fill();
      });
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }

    let isVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !animFrameIdRef.current) {
        lastTime = performance.now();
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible) {
        animFrameIdRef.current = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Smooth mouse parallax interpolation
      const mouse = mouseRef.current;
      mouse.currentX += (mouse.targetX - mouse.currentX) * (dt * 3.2);
      mouse.currentY += (mouse.targetY - mouse.currentY) * (dt * 3.2);

      // Decay hue back to violet (270)
      targetHueRef.current += (270 - targetHueRef.current) * (dt * 1.5);
      hueRef.current += (targetHueRef.current - hueRef.current) * (dt * 3.5);

      // Deep pitch black void
      if (isWarping) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);

        // Cold, subtle dark cosmic nebula - deep charcoal and cold steel smoke
        const neb1X = cx * 0.65 + mouse.currentX * 30;
        const neb1Y = cy * 0.7 + mouse.currentY * 30;
        const grad1 = ctx.createRadialGradient(neb1X, neb1Y, 30, neb1X, neb1Y, 480);
        grad1.addColorStop(0, "rgba(24, 24, 27, 0.25)"); // Deep graphite
        grad1.addColorStop(0.6, "rgba(9, 9, 11, 0.08)");
        grad1.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, w, h);

        const neb2X = cx * 1.4 + mouse.currentX * 40;
        const neb2Y = cy * 1.25 + mouse.currentY * 40;
        const grad2 = ctx.createRadialGradient(neb2X, neb2Y, 40, neb2X, neb2Y, 520);
        grad2.addColorStop(0, "rgba(30, 41, 59, 0.15)"); // Deep cold steel
        grad2.addColorStop(0.6, "rgba(15, 23, 42, 0.05)");
        grad2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, w, h);
      }

      // Smooth transition for downward/upward warp speed
      const targetSpeed = isWarping ? 4.2 : 0;
      descendSpeedRef.current += (targetSpeed - descendSpeedRef.current) * (dt * (isWarping ? 2.8 : 3.5));

      const activeHue = Math.round(hueRef.current);

      // Update and draw shockwave ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 380 * dt;
        r.strength *= r.decay;

        if (r.radius > r.maxRadius || r.strength < 0.1) {
          ripples.splice(i, 1);
        }
      }

      // Draw and update stars - smooth cosmic drift and directional warp streaming
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Directional drift:
        // When warpDirection === "down" (returning to chat): stars stream top to bottom (+y)
        // When warpDirection === "up" (generating data): stars stream bottom to top (-y)
        const drift = descendSpeedRef.current * (0.8 + s.z * 1.2) * 60 * dt;
        const driftY = warpDirection === "down" ? drift : -drift;

        s.x += s.vx;
        s.y += s.vy + driftY;

        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) {
          s.y = h;
          s.x = Math.random() * w;
        }
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }

        const twinkle = Math.sin(time * 0.001 * s.twinkleSpeed * 100 + s.twinkleOffset);
        s.alpha = s.baseAlpha + twinkle * 0.22;

          let displacementX = 0;
          let displacementY = 0;
          let flareAlpha = 0;

          for (let k = 0; k < ripples.length; k++) {
            const rip = ripples[k];
            const dx = s.x - rip.x;
            const dy = s.y - rip.y;
            const dist = Math.hypot(dx, dy);
            const distDiff = Math.abs(dist - rip.radius);

            if (distDiff < 50) {
              const factor = (1 - distDiff / 50) * (rip.strength / 14);
              displacementX += (dx / (dist || 1)) * factor * 6;
              displacementY += (dy / (dist || 1)) * factor * 6;
              flareAlpha += factor * 0.55;
            }
          }

          // Smooth Mouse Parallax based on depth layer (z)
          const parallaxX = mouse.currentX * s.z * 18;
          const parallaxY = mouse.currentY * s.z * 18;

          const drawX = s.x + displacementX + parallaxX;
          const drawY = s.y + displacementY + parallaxY;
          const finalAlpha = Math.min(Math.max(s.alpha + flareAlpha, 0.15), 1);

          ctx.beginPath();
          ctx.arc(drawX, drawY, s.baseRadius * (1 + flareAlpha * 0.6), 0, Math.PI * 2);

          if (s.z === 3 || flareAlpha > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
            ctx.shadowBlur = s.z === 3 ? 6 : 2;
            ctx.shadowColor = `rgba(255, 255, 255, 0.45)`;
          } else {
            ctx.fillStyle = `rgba(203, 213, 225, ${finalAlpha * 0.85})`;
            ctx.shadowBlur = 0;
          }

          ctx.fill();
        }

      ctx.shadowBlur = 0;
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isWarping]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
}
