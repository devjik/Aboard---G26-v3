"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ParallaxSection — background layer moves slower than foreground text.
 *
 * Editorial version: very subtle (10-20% offset), never aggressive.
 * Wrap a section; the children get a slight upward parallax on scroll.
 *
 * `speed` controls intensity:
 *   - 0.1 = barely-there (default, editorial)
 *   - 0.3 = noticeable
 *   - 0.5 = dramatic (use sparingly)
 *
 * Under reduced motion: renders as a plain div.
 */
export function ParallaxSection({
  children,
  speed = 0.1,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${-speed * 100}%`]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/**
 * ParallaxImage — Ken Burns zoom + subtle parallax for hero images.
 * The image slowly scales 1 → 1.08 over 20s and parallaxes on scroll.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  kenBurns = true,
}: {
  src: string;
  alt: string;
  className?: string;
  kenBurns?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={cn("overflow-hidden", className)}>
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="h-full w-full object-cover will-change-transform"
        animate={kenBurns ? { scale: [1, 1.08] } : undefined}
        transition={
          kenBurns
            ? { duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
            : undefined
        }
      />
    </div>
  );
}
