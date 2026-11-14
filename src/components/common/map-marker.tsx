"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type MarkerTone = "bus" | "stop" | "origin" | "dest";

const TONE_STYLES: Record<MarkerTone, { bg: string; ring: string; label?: string }> = {
  bus: { bg: "#047857", ring: "rgba(16,185,129,0.35)" },
  stop: { bg: "#f59e0b", ring: "rgba(245,158,11,0.35)" },
  origin: { bg: "#047857", ring: "rgba(4,120,87,0.4)" },
  dest: { bg: "#dc2626", ring: "rgba(220,38,38,0.4)" },
};

export function MapMarker({
  x,
  y,
  tone = "stop",
  label,
  pulsing = false,
  size = 18,
}: {
  x: number;
  y: number;
  tone?: MarkerTone;
  label?: string;
  pulsing?: boolean;
  size?: number;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ left: x, top: y }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <div className="relative flex flex-col items-center">
        {pulsing && (
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size,
              height: size,
              background: styles.ring,
              animation: "aboard-pulse-ring 1.6s ease-out infinite",
            }}
          />
        )}
        <div
          className={cn(
            "relative rounded-full border-2 border-white shadow-card",
          )}
          style={{
            width: size,
            height: size,
            background: styles.bg,
          }}
        />
        {label && (
          <span className="mt-1 rounded-md bg-card px-1.5 py-0.5 text-[9px] font-medium shadow-card">
            {label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
