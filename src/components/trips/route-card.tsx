"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bus, Clock, MapPin } from "lucide-react";
import { formatGHS } from "@/lib/config/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RouteDeparture {
  tripId: string;
  departureAt: string; // ISO
  seatsAvailable: number;
}

export interface RouteAggregate {
  id: string;
  originName: string;
  originRegion: string;
  destName: string;
  destRegion: string;
  distanceKm: number;
  durationMin: number;
  priceFromPesewa: number;
  operatorName: string;
  departures: RouteDeparture[];
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function RouteCard({
  route,
  onBook,
  className,
}: {
  route: RouteAggregate;
  onBook?: (route: RouteAggregate, departure: RouteDeparture) => void;
  className?: string;
}) {
  const next = route.departures[0];
  const rest = route.departures.slice(1, 4);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-primary text-primary-foreground">
            <Bus className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 font-display text-base font-bold">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {route.originName}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                {route.destName}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {route.originRegion} → {route.destRegion} · {route.operatorName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            From
          </div>
          <div className="font-display text-lg font-bold text-grad-primary">
            {formatGHS(route.priceFromPesewa)}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {fmtDuration(route.durationMin)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          {route.distanceKm} km
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
          {route.departures.length} departures
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            onClick={() => onBook?.(route, next)}
            className="group inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
          >
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {fmtDate(next.departureAt)}
              </div>
              <div className="font-semibold text-foreground">
                {fmtTime(next.departureAt)}
              </div>
            </div>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
              NEXT
            </span>
          </button>
        )}
        {rest.map((d) => (
          <button
            key={d.tripId}
            type="button"
            onClick={() => onBook?.(route, d)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40"
          >
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {fmtDate(d.departureAt)}
            </div>
            <div className="text-sm font-medium">{fmtTime(d.departureAt)}</div>
          </button>
        ))}
        {route.departures.length > 4 && (
          <span className="inline-flex items-center rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            +{route.departures.length - 4} more
          </span>
        )}
      </div>

      <Button
        onClick={() => next && onBook?.(route, next)}
        disabled={!next}
        className="w-full rounded-xl bg-grad-primary text-primary-foreground"
      >
        Book now — {next ? fmtTime(next.departureAt) : "no trips"}
      </Button>
    </motion.article>
  );
}
