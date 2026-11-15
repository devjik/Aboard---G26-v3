"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bus, Clock, MapPin, Users } from "lucide-react";
import { formatGHS } from "@/lib/config/app";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TripCardData {
  id: string;
  departureAt: string;
  arrivalAt: string | null;
  status: string;
  basePricePesewa: number;
  seatsAvailable: number;
  originName: string;
  originRegion: string;
  destName: string;
  destRegion: string;
  durationMin: number;
  distanceKm: number;
  busPlateNumber?: string | null;
  operatorName: string;
  operatorId: string;
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

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TripCard({
  trip,
  onSelect,
  className,
}: {
  trip: TripCardData;
  onSelect?: (trip: TripCardData) => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-grad-primary" />
      <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bus className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {trip.originName}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                {trip.destName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {trip.operatorName} · {trip.busPlateNumber ?? "Plate N/A"}
              </div>
            </div>
          </div>
          <StatusPill
            tone={trip.status === "ACTIVE" ? "success" : "neutral"}
            dot
            pulse={trip.status === "ACTIVE"}
          >
            {trip.status}
          </StatusPill>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {fmtTime(trip.departureAt)} →{" "}
            {trip.arrivalAt ? fmtTime(trip.arrivalAt) : "—"}
          </span>
          <span>· {fmtDuration(trip.durationMin)}</span>
          <span>· {trip.distanceKm} km</span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {trip.seatsAvailable} seats left
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              From
            </div>
            <div className="font-display text-lg font-bold text-grad-primary">
              {formatGHS(trip.basePricePesewa)}
            </div>
          </div>
          <Button
            onClick={() => onSelect?.(trip)}
            className="rounded-full bg-grad-primary text-primary-foreground"
          >
            View seats
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
