"use client";

import {
  ANIMATION_REGISTRY,
  AnimationSlot,
  getAnimation,
} from "@/lib/animations/registry";
import { cn } from "@/lib/utils";

interface AnimationProps {
  slot: AnimationSlot;
  className?: string;
  label?: string;
}

/**
 * Renders a CSS/SVG placeholder for an animation slot. Real Lottie/JSON
 * animations are disabled in the registry by default — when they become
 * available (paths set, enabled=true) this component will switch to render
 * the real file via dynamic import.
 */
export function Animation({ slot, className, label }: AnimationProps) {
  const entry = getAnimation(slot);
  if (!entry) return null;
  if (entry.enabled) {
    // Future: dynamic(() => import(entry.path)) for real lottie files
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          className,
        )}
        aria-label={label ?? slot}
        data-slot={slot}
      >
        <Placeholder slot={slot} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className,
      )}
      aria-label={label ?? slot}
      data-slot={slot}
    >
      <Placeholder slot={slot} />
    </div>
  );
}

function Placeholder({ slot }: { slot: AnimationSlot }) {
  switch (slot) {
    case AnimationSlot.Loading:
      return <Spinner />;
    case AnimationSlot.BookingSuccess:
      return <Checkmark />;
    case AnimationSlot.BusArriving:
    case AnimationSlot.DriverEnroute:
    case AnimationSlot.BusDeparting:
      return <BusPulse />;
    case AnimationSlot.PaymentPending:
      return <Spinner label="Payment pending" />;
    case AnimationSlot.SeatLocked:
      return <SeatPulse />;
    case AnimationSlot.TicketIssued:
      return <Checkmark label="Ticket issued" />;
    case AnimationSlot.TripCancelled:
      return <CrossMark />;
    case AnimationSlot.EmptyInbox:
      return <BellQuiet />;
    case AnimationSlot.RouteNotFound:
      return <CrossMark label="Route not found" />;
    case AnimationSlot.NetworkError:
      return <CrossMark label="Network error" />;
    case AnimationSlot.AccountVerified:
      return <Checkmark label="Verified" />;
    case AnimationSlot.Welcome:
    case AnimationSlot.Tracking:
    default:
      return <LogoMark />;
  }
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary"
        style={{ animation: "spin 0.9s linear infinite" }}
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Checkmark({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="var(--primary)"
          strokeWidth="3"
          fill="var(--primary)"
          fillOpacity="0.1"
        />
        <path
          d="M19 33 L29 43 L46 23"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

function CrossMark({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="var(--destructive)"
          strokeWidth="3"
          fill="var(--destructive)"
          fillOpacity="0.1"
        />
        <path
          d="M22 22 L42 42 M42 22 L22 42"
          stroke="var(--destructive)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

function BusPulse() {
  return (
    <div className="relative flex items-center justify-center">
      <span
        className="absolute h-16 w-16 rounded-full bg-primary/20"
        style={{ animation: "aboard-pulse-ring 1.6s ease-out infinite" }}
      />
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect
          x="8"
          y="10"
          width="32"
          height="24"
          rx="4"
          fill="var(--primary)"
        />
        <rect x="12" y="14" width="10" height="8" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="26" y="14" width="10" height="8" rx="1" fill="white" fillOpacity="0.5" />
        <circle cx="16" cy="34" r="3" fill="#0a0a0a" />
        <circle cx="32" cy="34" r="3" fill="#0a0a0a" />
      </svg>
    </div>
  );
}

function SeatPulse() {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center rounded-md border-2 border-primary bg-primary/10">
      <span className="text-[10px] font-bold text-primary">3B</span>
      <span
        className="absolute inset-0 rounded-md border-2 border-primary"
        style={{ animation: "aboard-pulse-ring 1.4s ease-out infinite" }}
      />
    </div>
  );
}

function BellQuiet() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <path
        d="M14 38h28a4 4 0 0 0 4-4v-2a4 4 0 0 1-2-3.5V24a14 14 0 0 0-28 0v4.5A4 4 0 0 1 12 32v2a4 4 0 0 0 4 4z"
        stroke="var(--muted-foreground)"
        strokeWidth="2.5"
        fill="none"
      />
      <path d="M24 42a4 4 0 0 0 8 0" stroke="var(--muted-foreground)" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <defs>
        <linearGradient id="anim-logo-grad" x1="0" y1="0" x2="56" y2="56">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="48"
        height="48"
        rx="14"
        fill="url(#anim-logo-grad)"
      />
      <path
        d="M16 38 L28 18 L40 38"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="32" r="3" fill="white" />
    </svg>
  );
}

// silence unused
void ANIMATION_REGISTRY;
