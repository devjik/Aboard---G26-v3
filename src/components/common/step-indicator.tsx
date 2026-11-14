"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  description?: string;
}

export function StepIndicator({
  steps,
  current,
  done = [],
  className,
}: {
  steps: Step[];
  current: number; // 0-indexed active step
  done?: number[]; // indexes completed
  className?: string;
}) {
  const total = steps.length;
  const pctDone = (Math.min(current, total - 1) / Math.max(1, total - 1)) * 100;
  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex justify-between">
        <div className="absolute left-0 top-4 h-0.5 w-full bg-muted" />
        <motion.div
          className="absolute left-0 top-4 h-0.5 bg-grad-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pctDone}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        />
        {steps.map((s, i) => {
          const isDone = done.includes(i) || i < current;
          const isActive = i === current;
          return (
            <div
              key={i}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.08 : 1,
                  boxShadow: isActive
                    ? "0 0 0 6px color-mix(in srgb, var(--primary) 18%, transparent)"
                    : "0 0 0 0 rgba(0,0,0,0)",
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? "border-primary bg-card text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </motion.div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-[11px] font-medium leading-tight",
                    isActive
                      ? "text-foreground"
                      : isDone
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70",
                  )}
                >
                  {s.label}
                </div>
                {s.description && (
                  <div className="hidden text-[10px] text-muted-foreground sm:block">
                    {s.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
