"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * BentoGrid — modular editorial grid of varied-size boxes.
 *
 * Editorial version: NOT glossy bento with neon borders — this is a
 * magazine-style grid with thin 1px dividers between cells, white cards
 * on cream background, varied spans for visual rhythm.
 *
 * Pass children in order; each child should be a <BentoCell> with a span.
 */
export function BentoGrid({
  children,
  className,
  cols = 3,
}: {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}) {
  const colsClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[cols];
  return (
    <div className={cn("grid grid-cols-1 gap-px bg-border", colsClass, className)}>
      {children}
    </div>
  );
}

export function BentoCell({
  children,
  span = 1,
  rowSpan = 1,
  className,
}: {
  children: ReactNode;
  span?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  className?: string;
}) {
  const spanClass = {
    1: "",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
  }[span];
  const rowSpanClass = rowSpan === 2 ? "md:row-span-2" : "";
  return (
    <div
      className={cn(
        "bg-card p-6 md:p-8 transition-colors hover:bg-secondary/40",
        spanClass,
        rowSpanClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
