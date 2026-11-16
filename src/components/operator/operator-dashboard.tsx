"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bus,
  ChevronRight,
  Download,
  MapPin,
  Route as RouteIcon,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { apiClient, type DashboardData } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/status-pill";
import { EmptyState } from "@/components/common/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { formatGHS } from "@/lib/config/app";
import { cn } from "@/lib/utils";

type Tab = "overview" | "fleet" | "manifests" | "earnings" | "performance";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
  { id: "fleet", label: "Fleet", icon: <Bus className="h-4 w-4" /> },
  { id: "manifests", label: "Manifests", icon: <Users className="h-4 w-4" /> },
  { id: "earnings", label: "Earnings", icon: <Wallet className="h-4 w-4" /> },
  { id: "performance", label: "Performance", icon: <TrendingUp className="h-4 w-4" /> },
];

interface OperatorUser {
  id: string;
  name?: string;
  role?: string;
  operatorId?: string;
}

export function OperatorDashboard({
  user,
  className,
}: {
  user: OperatorUser;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const dashQ = useQuery({
    queryKey: ["operator-dashboard", user.id],
    queryFn: () => apiClient.admin.dashboard(),
    staleTime: 30 * 1000,
  });

  const tripsQ = useQuery({
    queryKey: ["operator-trips", user.id],
    queryFn: () => apiClient.trips.search({ page: 1, pageSize: 50 }),
    staleTime: 30 * 1000,
  });

  const data = dashQ.data;
  const trips = tripsQ.data?.items ?? [];

  return (
    <div className={cn("space-y-6", className)}>
      <Reveal>
        <div className="flex flex-col gap-2 border-b border-border pb-6">
          <span className="eyebrow">Operator console</span>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {user.name ?? "Operator"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your fleet, schedules, manifests, and payouts. Real data from real bookings.
          </p>
        </div>
      </Reveal>

      <div className="relative inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="operator-tab-pill"
                className="absolute inset-0 rounded-full bg-grad-primary"
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {dashQ.isLoading ? (
              <OverviewSkeleton />
            ) : dashQ.error ? (
              <EmptyState
                title="Couldn't load dashboard"
                description="Check the API connection and try again."
                action={
                  <Button onClick={() => dashQ.refetch()} variant="outline">
                    Retry
                  </Button>
                }
              />
            ) : data ? (
              <>
                <KPIRow data={data} />
                <ChartRow data={data} />
                <RecentBookingsTable data={data} />
              </>
            ) : null}
          </motion.div>
        )}

        {tab === "fleet" && (
          <motion.div
            key="fleet"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <FleetView trips={trips} loading={tripsQ.isLoading} />
          </motion.div>
        )}

        {tab === "manifests" && (
          <motion.div
            key="manifests"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <ManifestsView data={data} loading={dashQ.isLoading} />
          </motion.div>
        )}

        {tab === "earnings" && (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {data ? <EarningsView data={data} /> : <OverviewSkeleton />}
          </motion.div>
        )}

        {tab === "performance" && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {data ? <PerformanceView data={data} /> : <OverviewSkeleton />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPIRow({ data }: { data: DashboardData }) {
  const kpis = [
    { label: "Total bookings", value: String(data.totalBookings), icon: <BarChart3 className="h-4 w-4" /> },
    { label: "Revenue (GHS)", value: data.totalRevenue, icon: <Wallet className="h-4 w-4" /> },
    { label: "Active routes", value: String(data.activeRoutes), icon: <RouteIcon className="h-4 w-4" /> },
    { label: "Confirmed today", value: String(data.confirmedToday), icon: <Activity className="h-4 w-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      {kpis.map((k) => (
        <TiltCard key={k.label} max={6} className="bg-card">
          <div className="flex h-full flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                {k.icon}
              </span>
              <Settings className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <div>
              <div className="stat-num text-3xl">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.label}</div>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  );
}

function ChartRow({ data }: { data: DashboardData }) {
  const maxBookings = Math.max(...data.chartData.map((d) => d.bookings), 1);
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="eyebrow">Last 7 days</span>
          <h3 className="mt-1 font-display text-lg font-medium">Bookings trend</h3>
        </div>
        <Button variant="ghost" size="sm" className="rounded-full">
          <Download className="mr-1 h-3.5 w-3.5" /> Export
        </Button>
      </div>
      <div className="flex h-40 items-end justify-between gap-2">
        {data.chartData.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.bookings / maxBookings) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-t-sm bg-grad-primary"
                style={{ minHeight: d.bookings > 0 ? "4px" : "0" }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentBookingsTable({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-display text-lg font-medium">Recent bookings</h3>
        <span className="text-xs text-muted-foreground">{data.recentBookings.length} most recent</span>
      </div>
      <div className="divide-y divide-border">
        {data.recentBookings.map((b) => (
          <div key={b.id} className="flex items-center gap-4 p-4 text-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium">
              {b.studentName?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{b.studentName}</div>
              <div className="truncate text-xs text-muted-foreground">{b.routeLabel} · Seat {b.seatLabel}</div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="font-medium">{formatGHS(b.amountPesewa)}</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(b.createdAt).toLocaleDateString("en-GH", { month: "short", day: "numeric" })}
              </div>
            </div>
            <StatusPill status={b.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FleetView({ trips, loading }: { trips: Array<any>; loading: boolean }) {
  const buses = Array.from(
    new Map(
      trips.map((t) => [
        t.busPlateNumber ?? "—",
        {
          plate: t.busPlateNumber ?? "—",
          operator: t.operatorName,
          tripCount: trips.filter((x: any) => x.busPlateNumber === t.busPlateNumber).length,
        },
      ]),
    ).values(),
  );
  if (loading) return <SkeletonRow />;
  if (buses.length === 0)
    return (
      <EmptyState
        title="No buses in service yet"
        description="Once your trips are scheduled, buses appear here with live trip counts and seat fill."
      />
    );
  return (
    <div className="grid gap-px bg-border md:grid-cols-2">
      {buses.map((b) => (
        <TiltCard key={b.plate} max={6} className="bg-card">
          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bus className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg font-medium">{b.plate}</div>
              <div className="text-xs text-muted-foreground">{b.operator} · {b.tripCount} upcoming trips</div>
            </div>
            <StatusPill status="ACTIVE" />
          </div>
        </TiltCard>
      ))}
    </div>
  );
}

function ManifestsView({ data, loading }: { data?: DashboardData; loading: boolean }) {
  if (loading || !data) return <SkeletonRow />;
  if (data.routesFill.length === 0)
    return (
      <EmptyState
        title="No upcoming trips"
        description="Schedule trips from the Routes tab to see manifests here."
      />
    );
  return (
    <div className="space-y-3">
      {data.routesFill.map((t) => (
        <div key={t.tripId} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-base font-medium">{t.routeLabel}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.departureAt).toLocaleString("en-GH", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-medium">{t.booked}/{t.capacity}</div>
              <div className="text-[10px] text-muted-foreground">seats filled</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${t.fillPct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "h-full rounded-full",
                t.fillPct >= 80 ? "bg-grad-danger" : t.fillPct >= 50 ? "bg-grad-primary" : "bg-grad-tan",
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EarningsView({ data }: { data: DashboardData }) {
  const totalRevenue = data.chartData.reduce((s, d) => s + d.revenue, 0);
  const avgPerDay = totalRevenue / 7;
  return (
    <div className="space-y-4">
      <div className="grid gap-px bg-border md:grid-cols-3">
        <div className="bg-card p-6">
          <span className="eyebrow">7-day revenue</span>
          <div className="stat-num mt-2 text-4xl text-tan">{formatGHS(totalRevenue)}</div>
        </div>
        <div className="bg-card p-6">
          <span className="eyebrow">Avg / day</span>
          <div className="stat-num mt-2 text-4xl">{formatGHS(avgPerDay)}</div>
        </div>
        <div className="bg-card p-6">
          <span className="eyebrow">Pending payout</span>
          <div className="stat-num mt-2 text-4xl">{formatGHS(totalRevenue * 0.85)}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">15% platform fee deducted</div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-medium">Payouts</h3>
          <Button variant="outline" size="sm" className="rounded-full">
            <Download className="mr-1 h-3.5 w-3.5" /> Statement
          </Button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span>Payout for period ending {new Date().toLocaleDateString()}</span>
            <StatusPill status="PENDING" />
          </div>
          <div className="flex items-center justify-between border-b border-border pb-2 text-muted-foreground">
            <span>Previous payout</span>
            <StatusPill status="COMPLETED" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceView({ data }: { data: DashboardData }) {
  const avgFill =
    data.routesFill.length > 0
      ? Math.round(data.routesFill.reduce((s, t) => s + t.fillPct, 0) / data.routesFill.length)
      : 0;
  return (
    <div className="grid gap-px bg-border md:grid-cols-2">
      <div className="bg-card p-6">
        <span className="eyebrow">Average seat fill</span>
        <div className="stat-num mt-2 text-5xl">{avgFill}%</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-grad-primary" style={{ width: `${avgFill}%` }} />
        </div>
      </div>
      <div className="bg-card p-6">
        <span className="eyebrow">Top routes by fill</span>
        <div className="mt-3 space-y-2">
          {[...data.routesFill]
            .sort((a, b) => b.fillPct - a.fillPct)
            .slice(0, 5)
            .map((t) => (
              <div key={t.tripId} className="flex items-center justify-between text-sm">
                <span className="truncate">{t.routeLabel}</span>
                <span className="font-medium text-tan">{t.fillPct}%</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-card p-6">
            <div className="shimmer h-9 w-9 rounded-md" />
            <div className="shimmer mt-4 h-7 w-20" />
            <div className="shimmer mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="shimmer h-48 w-full rounded-lg" />
      <div className="shimmer h-64 w-full rounded-lg" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid gap-px bg-border md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-card p-6">
          <div className="shimmer h-12 w-12 rounded-md" />
          <div className="shimmer mt-3 h-4 w-32" />
          <div className="shimmer mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
