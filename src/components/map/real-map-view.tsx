"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bus,
  LocateFixed,
  MapPin,
  ShieldAlert,
  SkipForward,
  Radio,
} from "lucide-react";
import { useGeolocation, useDriverSimulation } from "@/lib/hooks/use-geolocation";
import { useTrackingSocket, distanceMeters, BOARDING_THRESHOLD_M, type DriverPosition } from "@/lib/hooks/use-tracking-socket";
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

  // Subscribe to REAL driver positions via Socket.IO
  const { connected, subscribe } = useTrackingSocket();
  const [liveDriverPos, setLiveDriverPos] = useState<DriverPosition | null>(null);

  // Fall back to simulation only when no live driver is broadcasting
  const simulatedDriver = useDriverSimulation(stops);
  const driver = liveDriverPos ?? simulatedDriver;

  // Track whether we've already sent the boarding notification (dedupe per trip)
  const boardingNotifiedRef = useRef(false);

  // Subscribe to the selected trip's driver positions
  useEffect(() => {
    if (!tripDetail?.id) return;
    setLiveDriverPos(null);
    boardingNotifiedRef.current = false;
    const unsub = subscribe(
      tripDetail.id,
      (pos) => setLiveDriverPos(pos),
      () => setLiveDriverPos(null),
    );
    return unsub;
  }, [tripDetail?.id, subscribe]);

  // Proximity check: when student is within 200m of driver, notify parent
  useEffect(() => {
    if (!geo.point || !driver || !tripDetail?.id || !user) return;
    const dist = distanceMeters(geo.point.lat, geo.point.lng, driver.lat, driver.lng);
    if (dist <= BOARDING_THRESHOLD_M && !boardingNotifiedRef.current) {
      boardingNotifiedRef.current = true;
      apiClient.notifications
        .notifyBoarding({
          tripId: tripDetail.id,
          studentId: user.id,
          distanceMeters: dist,
          driverLat: driver.lat,
          driverLng: driver.lng,
          studentLat: geo.point.lat,
          studentLng: geo.point.lng,
        })
        .then((res) => {
          if (res.ok && !res.alreadyNotified) {
            toast.success("Boarding detected!", {
              description: `You're ${Math.round(dist)}m from the bus. Your parent has been notified you're aboard.`,
            });
          }
        })
        .catch(() => {});
    }
  }, [geo.point, driver, tripDetail?.id, user]);

  const tripList = useQuery({
    queryKey: ["trips", "live"],
    queryFn: () => apiClient.trips.search({ page: 1, pageSize: 10 }),
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

  // If permission is genuinely "prompt" (browser will ask) or "denied",
  // show the permission card. If "granted" (or still resolving from the
  // sign-in modal), go straight to the map — the user's real position
  // will appear the instant the GPS reading arrives.
  if (
    !skipped &&
    (geo.permission === "prompt" || geo.permission === "denied") &&
    !geo.point
  ) {
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
        {/* status pills */}
        <div className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2">
          <StatusPill
            tone={userPosition ? "success" : "neutral"}
            dot
            pulse={!!userPosition}
          >
            {userPosition ? "You are here" : "Locating…"}
          </StatusPill>
          {liveDriverPos ? (
            <StatusPill tone="success" dot pulse>
              <Radio className="mr-1 inline size-3" /> Bus live
            </StatusPill>
          ) : (
            <StatusPill tone="accent" dot>
              Bus (simulated)
            </StatusPill>
          )}
          {connected && (
            <StatusPill tone="primary" dot>
              <Radio className="mr-1 inline size-3" /> Connected
            </StatusPill>
          )}
        </div>
        {/* live coordinates */}
        {userPosition && (
          <div className="absolute bottom-3 left-3 z-30 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground shadow-card backdrop-blur">
            {userPosition.lat.toFixed(4)}, {userPosition.lng.toFixed(4)}
            {typeof userPosition.accuracy === "number" && (
              <span className="ml-1">±{Math.round(userPosition.accuracy)}m</span>
            )}
          </div>
        )}
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
            <div className="mb-1">
              {tripDetail.stops?.length ?? 0} stops ·{" "}
              {tripDetail.basePricePesewa
                ? formatGHS(tripDetail.basePricePesewa)
                : ""}
            </div>
            {userPosition && tripDetail.stops?.[0] && (
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-2 py-1.5 text-primary">
                <LocateFixed className="h-3 w-3" />
                <span className="font-medium">
                  {haversineKm(
                    userPosition.lat,
                    userPosition.lng,
                    tripDetail.stops[0].lat,
                    tripDetail.stops[0].lng,
                  ).toFixed(1)}{" "}
                  km from you to {tripDetail.stops[0].name}
                </span>
              </div>
            )}
            {userPosition && (
              <div className="mt-1 text-[10px] text-muted-foreground/70">
                Your position updates live · accuracy ±
                {Math.round(userPosition.accuracy ?? 0)}m
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// silence unused import
void useEffect;

/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
