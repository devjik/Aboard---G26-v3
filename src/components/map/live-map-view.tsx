"use client";

import { motion } from "framer-motion";
import { Bus, MapPin } from "lucide-react";
import { StatusPill } from "@/components/common/status-pill";
import { MapMarker } from "@/components/common/map-marker";
import type { StopT } from "@/lib/api/contracts/trips";
import { cn } from "@/lib/utils";

export type LiveMapStop = StopT;

export function LiveMapView({
  stops,
  driverPosition,
  tripId,
  status,
  className,
}: {
  stops: LiveMapStop[];
  driverPosition?: { lat: number; lng: number } | null;
  tripId?: string;
  status?: string;
  className?: string;
}) {
  // Project lat/lng into a 0-100 x/y box for the stylized map
  if (stops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No stops to display.
      </div>
    );
  }
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  if (driverPosition) {
    lats.push(driverPosition.lat);
    lngs.push(driverPosition.lng);
  }
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) * 0.1 || 0.1;
  const padLng = (maxLng - minLng) * 0.1 || 0.1;
  const project = (lat: number, lng: number) => {
    const x =
      ((lng - (minLng - padLng)) /
        (maxLng - minLng + 2 * padLng)) *
      100;
    const y =
      (1 -
        (lat - (minLat - padLat)) /
          (maxLat - minLat + 2 * padLat)) *
      100;
    return { x, y };
  };

  const points = stops.map((s) => ({ ...s, ...project(s.lat, s.lng) }));
  const driver = driverPosition
    ? { ...project(driverPosition.lat, driverPosition.lng) }
    : null;
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <div className="absolute inset-0 bg-grad-hero opacity-10" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <polyline
          points={polyline}
          fill="none"
          stroke="url(#route-line)"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 1.5"
        />
      </svg>
      <div className="relative h-[320px] sm:h-[420px]">
        {points.map((p, i) => (
          <MapMarker
            key={p.id ?? i}
            x={`${p.x}%`}
            y={`${p.y}%`}
            tone={p.type === "ORIGIN" ? "origin" : p.type === "DEST" ? "dest" : "stop"}
            label={p.name}
            size={14}
          />
        ))}
        {driver && (
          <MapMarker
            x={`${driver.x}%`}
            y={`${driver.y}%`}
            tone="bus"
            label="Bus"
            pulsing
            size={20}
          />
        )}
      </div>
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <StatusPill tone="success" dot pulse>
          {status ?? "ACTIVE"}
        </StatusPill>
        {tripId && (
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
            Trip {tripId.slice(-6)}
          </span>
        )}
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-xl bg-background/80 p-2 backdrop-blur">
        <div className="flex items-center gap-1.5 text-xs">
          <Bus className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">Live tracking</span>
          <span className="text-muted-foreground">· GPS every 4s</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {stops.length} stops
        </div>
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
    </div>
  );
}
