"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { TripCard, type TripCardData } from "./trip-card";
import { RouteCard, type RouteAggregate } from "./route-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REGION_NAMES, type RegionName } from "@/lib/config/ghana";
import { cn } from "@/lib/utils";
import { MagneticWrap } from "@/components/motion/magnetic-wrap";

interface TripsExplorerProps {
  trips: TripCardData[];
  onSelectTrip?: (trip: TripCardData) => void;
  onSelectRoute?: (route: RouteAggregate, departure?: any) => void;
}

type TabKey = "available" | "popular" | "regions";

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: "available", label: "Available Trips" },
  { id: "popular", label: "Popular Routes" },
  { id: "regions", label: "By Region" },
];

export function aggregateRoutes(
  trips: TripCardData[],
): RouteAggregate[] {
  const map = new Map<string, RouteAggregate>();
  for (const t of trips) {
    const key = `${t.originName}-${t.destName}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        originName: t.originName,
        originRegion: t.originRegion,
        destName: t.destName,
        destRegion: t.destRegion,
        distanceKm: t.distanceKm,
        durationMin: t.durationMin,
        priceFromPesewa: t.basePricePesewa,
        operatorName: t.operatorName,
        departures: [],
      });
    }
    const r = map.get(key)!;
    r.priceFromPesewa = Math.min(r.priceFromPesewa, t.basePricePesewa);
    r.departures.push({
      tripId: t.id,
      departureAt: t.departureAt,
      seatsAvailable: t.seatsAvailable,
    });
  }
  return Array.from(map.values()).sort(
    (a, b) => b.departures.length - a.departures.length,
  );
}

export function TripsExplorer({
  trips,
  onSelectTrip,
  onSelectRoute,
}: TripsExplorerProps) {
  const [tab, setTab] = useState<TabKey>("available");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionName | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips.filter((t) => {
      if (region !== "ALL" && t.originRegion !== region) return false;
      if (!q) return true;
      return (
        t.originName.toLowerCase().includes(q) ||
        t.destName.toLowerCase().includes(q) ||
        t.originRegion.toLowerCase().includes(q) ||
        t.destRegion.toLowerCase().includes(q)
      );
    });
  }, [trips, query, region]);

  const routes = useMemo(() => aggregateRoutes(filtered), [filtered]);
  const regionsWithTrips = useMemo(() => {
    const s = new Set(trips.map((t) => t.originRegion as RegionName));
    return REGION_NAMES.filter((r) => s.has(r));
  }, [trips]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative inline-flex rounded-full border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-grad-primary"
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city or region…"
            className="rounded-full pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <RegionPill
          active={region === "ALL"}
          onClick={() => setRegion("ALL")}
        >
          All regions
        </RegionPill>
        {regionsWithTrips.map((r) => (
          <RegionPill
            key={r}
            active={region === r}
            onClick={() => setRegion(r)}
          >
            {r}
          </RegionPill>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "available" && (
          <motion.div
            key="available"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <RoutesView trips={filtered} onSelectTrip={onSelectTrip} />
          </motion.div>
        )}
        {tab === "popular" && (
          <motion.div
            key="popular"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {routes.slice(0, 6).map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                onBook={(route, dep) => onSelectRoute?.(route, dep)}
              />
            ))}
            {routes.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                No routes available for these filters.
              </div>
            )}
          </motion.div>
        )}
        {tab === "regions" && (
          <motion.div
            key="regions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <RegionsView
              trips={filtered}
              onSelectTrip={onSelectTrip}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RegionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <MagneticWrap strength={0.25}>
      <button
        onClick={onClick}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
        )}
      >
        <MapPin className="mr-1 inline-block h-3 w-3" />
        {children}
      </button>
    </MagneticWrap>
  );
}

export function RoutesView({
  trips,
  onSelectTrip,
}: {
  trips: TripCardData[];
  onSelectTrip?: (trip: TripCardData) => void;
}) {
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-display text-lg font-semibold">No trips yet</h3>
          <p className="text-sm text-muted-foreground">
            Try a different city, date, or region.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((t) => (
        <EnhancedTripCard key={t.id} trip={t} onSelect={onSelectTrip} />
      ))}
    </div>
  );
}

function EnhancedTripCard({
  trip,
  onSelect,
}: {
  trip: TripCardData;
  onSelect?: (trip: TripCardData) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <TripCard trip={trip} onSelect={onSelect} />
      <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          {new Date(trip.departureAt).toLocaleDateString("en-GH", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          {new Date(trip.departureAt).toLocaleTimeString("en-GH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>
    </div>
  );
}

export function RegionsView({
  trips,
  onSelectTrip,
}: {
  trips: TripCardData[];
  onSelectTrip?: (trip: TripCardData) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<RegionName, TripCardData[]>();
    for (const t of trips) {
      const arr = m.get(t.originRegion as RegionName) ?? [];
      arr.push(t);
      m.set(t.originRegion as RegionName, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [trips]);
  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No regions match your filters.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {grouped.map(([region, ts]) => (
        <details
          key={region}
          className="group rounded-2xl border border-border bg-card shadow-card"
          open
        >
          <summary className="flex cursor-pointer list-none items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display font-semibold">{region}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ts.length} departures
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <RoutesView trips={ts} onSelectTrip={onSelectTrip} />
          </div>
        </details>
      ))}
    </div>
  );
}

export { Button };
