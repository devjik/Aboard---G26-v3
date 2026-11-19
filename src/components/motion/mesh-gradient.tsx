"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * MeshGradient — lightweight animated mesh-gradient blobs.
 *
 * Editorial version: warm tan + cream + soft sage blobs drifting slowly
 * on a cream canvas. NOT neon lava-lamp — this is paper-light, magazine-
 * spread texture. Pause when off-screen or under reduced motion.
 *
 * Uses canvas (no WebGL dependency). 60fps via transform on the canvas
 * itself, not per-pixel redraws.
 */
export function MeshGradient({
  className,
  variant = "warm",
}: {
  className?: string;
  variant?: "warm" | "sage" | "ink";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let visible = true;
    const parent = canvas.parentElement;

    function resize() {
      if (!canvas || !parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx?.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    if (parent) io.observe(parent);

    const palettes = {
      warm: [
        { color: "rgba(184, 137, 90, 0.18)", x: 0.2, y: 0.3, r: 0.45 },
        { color: "rgba(212, 184, 150, 0.22)", x: 0.7, y: 0.6, r: 0.5 },
        { color: "rgba(107, 142, 90, 0.10)", x: 0.5, y: 0.85, r: 0.35 },
      ],
      sage: [
        { color: "rgba(107, 142, 90, 0.20)", x: 0.3, y: 0.4, r: 0.5 },
        { color: "rgba(143, 166, 118, 0.18)", x: 0.75, y: 0.3, r: 0.4 },
        { color: "rgba(184, 137, 90, 0.12)", x: 0.5, y: 0.8, r: 0.45 },
      ],
      ink: [
        { color: "rgba(212, 184, 150, 0.10)", x: 0.2, y: 0.3, r: 0.5 },
        { color: "rgba(184, 137, 90, 0.08)", x: 0.8, y: 0.5, r: 0.55 },
        { color: "rgba(143, 166, 118, 0.06)", x: 0.5, y: 0.85, r: 0.4 },
      ],
    } as const;

    const blobs = palettes[variant].map((b) => ({
      ...b,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.0004,
    }));

    function draw(t: number) {
      if (!canvas || !ctx || !parent) return;
      if (!visible) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.speed + b.phase) * 0.08) * w;
        const cy = (b.y + Math.cos(t * b.speed * 1.3 + b.phase) * 0.06) * h;
        const r = b.r * Math.max(w, h);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      io.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [reduceMotion, variant]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
