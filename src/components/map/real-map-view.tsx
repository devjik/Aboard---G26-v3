"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  LocateFixed,
  MapPin,
  ShieldAlert,
  SkipForward,
} from "lucide-react";
import { useGeolocation, useDriverSimulation } from "@/lib/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/status-pill";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { formatGHS } from "@/lib/config/app";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const MapInner = dynamic(() => import("./map-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
});

export interface RealMapViewProps {
  user?: { id: string; name: string; role: string } | null;
  trips?: Array<{ id: string; originName: string; destName: string }>;
  tripDetail?: any;
  onSelectTrip?: (tripId: string) => void;
  className?: string;
}

export function RealMapView({
  user,
  trips,
  tripDetail,
  onSelectTrip,
  className,
}: RealMapViewProps) {
  const geo = useGeolocation();
  const [skipped, setSkipped] = useState(false);

  const stops = useMemo(() => {
    if (tripDetail?.stops) return tripDetail.stops;
    return [];
  }, [tripDetail]);

  const driver = useDriverSimulation(stops);
  const tripList = useQuery({
    queryKey: ["trips", "live"],
    queryFn: () =>
      apiClient.trips.search({ page: 1, pageSize: 10 }),
    enabled: !!user && trips === undefined,
  });

  if (!user) {
    return (
      <EmptyState
        title="Sign in to track your bus"
        description="Live tracking is only available to signed-in passengers. This keeps the GPS stream private."
        icon={<ShieldAlert className="h-6 w-6" />}
        action={
          <p className="text-xs text-muted-foreground">
            Use the Sign in button in the header.
          </p>
        }
        className={className}
      />
    );
  }

  if (geo.permission === "unknown" && !skipped) {
    return (
      <Card
        className={cn(
          "flex flex-col items-center gap-4 p-6 text-center",
          className,
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LocateFixed className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold">
            Share your location
          </h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Aboard uses your location to show how far your bus is from you.
            Location is only stored while a trip is active, then deleted within
            7 days (per the Ghana Data Protection Act, 2012).
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => geo.request()} className="rounded-full bg-grad-primary">
            <LocateFixed className="mr-1 h-4 w-4" />
            Allow location
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setSkipped(true)}
          >
            <SkipForward className="mr-1 h-4 w-4" />
            Skip
          </Button>
        </div>
      </Card>
    );
  }

  const userPosition = geo.point
    ? { lat: geo.point.lat, lng: geo.point.lng, accuracy: geo.point.accuracy }
    : null;

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1fr_320px]", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <MapInner
          userPosition={userPosition}
          driverPosition={driver}
          stops={stops}
          routeLine={stops}
        />
        <div className="absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-2">
          <StatusPill
            tone={userPosition ? "success" : "neutral"}
            dot
            pulse={!!userPosition}
          >
            {userPosition ? "Location shared" : "Location off"}
          </StatusPill>
          <StatusPill tone="accent" dot>
            Simulated GPS
          </StatusPill>
        </div>
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">
            Live trips
          </h3>
          <Bus className="h-4 w-4 text-primary" />
        </div>
        <AnimatePresence mode="popLayout">
          {(trips ?? tripList.data?.items ?? []).slice(0, 8).map((t) => (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => onSelectTrip?.(t.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40",
                tripDetail?.id === t.id && "border-primary bg-primary/5",
              )}
            >
              <div>
                <div className="font-medium">
                  <MapPin className="mr-1 inline-block h-3 w-3 text-primary" />
                  {t.originName} → {t.destName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t.id.slice(-8)}
                </div>
              </div>
              <StatusPill tone="success" dot pulse>
                Live
              </StatusPill>
            </motion.button>
          ))}
        </AnimatePresence>
        {tripDetail && (
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            {tripDetail.stops?.length ?? 0} stops ·{" "}
            {tripDetail.basePricePesewa
              ? formatGHS(tripDetail.basePricePesewa)
              : ""}
          </div>
        )}
      </Card>
    </div>
  );
}

// silence unused import
void useEffect;
