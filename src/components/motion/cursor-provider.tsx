"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * CursorProvider — editorial custom cursor.
 *
 * - A small tan ring that lags slightly behind the pointer (spring via rAF).
 * - Grows + shows a tan tint when hovering interactive elements (a, button, [data-cursor="hover"]).
 * - Shrinks to a thin caret over text inputs and contenteditable.
 * - A soft spotlight blob follows the pointer over dark/belt sections only
 *   (data-cursor-section="belt") to add warmth without overwhelming.
 *
 * Disabled on touch devices (pointer: coarse) and under prefers-reduced-motion.
 * Native cursor remains visible — we layer on top, we don't hide it.
 */
export function CursorProvider({ children }: { children?: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const mq = window.matchMedia("(pointer: fine)");
    setEnabled(mq.matches);
    if (!mq.matches) return;

    const ring = ringRef.current;
    const spot = spotRef.current;
    if (!ring || !spot) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let spotX = mouseX;
    let spotY = mouseY;
    let rafId = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Hover state — interactive elements
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        'a, button, [role="button"], [data-cursor="hover"], input[type="checkbox"], input[type="radio"]',
      );
      const texty = target.closest(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="password"], textarea, [contenteditable="true"], [data-cursor="text"]',
      );
      const dragging = target.closest('[data-cursor="drag"]');

      ring.classList.toggle("is-hover", !!interactive || !!dragging);
      ring.classList.toggle("is-text", !!texty);

      // Spotlight only on belt/dark sections
      const section = target.closest('[data-cursor-section="belt"]');
      spot.style.opacity = section ? "1" : "0";
    }

    function tick() {
      // Ring: tighter lag (0.22)
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;
      // Spot: heavier lag (0.10) for parallax feel
      spotX += (mouseX - spotX) * 0.10;
      spotY += (mouseY - spotY) * 0.10;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      spot.style.transform = `translate(${spotX}px, ${spotY}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  if (!enabled) return <>{children}</>;

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      <div ref={spotRef} className="cursor-spotlight" aria-hidden />
      {children}
    </>
  );
}
