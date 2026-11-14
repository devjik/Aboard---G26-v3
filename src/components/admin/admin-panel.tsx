"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Download,
  Plus,
  Route as RouteIcon,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/common/status-pill";
import { formatGHS } from "@/lib/config/app";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { BottomSheet } from "@/components/common/bottom-sheet";

type Tab = "dashboard" | "routes" | "bookings" | "settings";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <Activity className="h-4 w-4" /> },
  { id: "routes", label: "Routes", icon: <RouteIcon className="h-4 w-4" /> },
  { id: "bookings", label: "Bookings", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export function AdminPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  layoutId="admin-tab-pill"
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
        {tab === "routes" && (
          <Button onClick={() => setAddOpen(true)} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" />
            Add route
          </Button>
        )}
        {tab === "bookings" && (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "#";
              link.download = "aboard-bookings.csv";
              toastCsvHint();
            }}
          >
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {tab === "dashboard" && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <DashboardTab />
          </motion.div>
        )}
        {tab === "routes" && (
          <motion.div
            key="routes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <RoutesTab />
          </motion.div>
        )}
        {tab === "bookings" && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <BookingsTab />
          </motion.div>
        )}
        {tab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <SettingsTab />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a new route"
        description="Define a new inter-city route with origin and destination."
      >
        <AddRouteForm onClose={() => setAddOpen(false)} />
      </BottomSheet>
    </div>
  );
}

function toastCsvHint() {
  import("sonner").then(({ toast }) =>
    toast.info("CSV export coming soon — wire this to /api/v1/admin/bookings.csv"),
  );
}

function DashboardTab() {
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiClient.admin.dashboard(),
  });
  if (q.isLoading) return <SkeletonGrid />;
  if (q.isError || !q.data)
    return (
      <EmptyState
        title="Could not load dashboard"
        description={(q.error as any)?.message}
      />
    );
  const d = q.data;
  const maxBookings = Math.max(1, ...d.chartData.map((c) => c.bookings));
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total bookings" value={String(d.totalBookings)} />
        <KPI label="Revenue" value={`GH₵${d.totalRevenue}`} tone="success" />
        <KPI label="Active routes" value={String(d.activeRoutes)} tone="accent" />
        <KPI
          label="Confirmed today"
          value={String(d.confirmedToday)}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bookings — last 7 days">
          <div className="flex h-44 items-end gap-2">
            {d.chartData.map((c, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: `${(c.bookings / maxBookings) * 100}%`,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  className="w-full rounded-t-md bg-grad-primary"
                />
                <span className="text-[10px] text-muted-foreground">
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Route fill — upcoming trips">
          <div className="space-y-2">
            {d.routesFill.slice(0, 6).map((r) => (
              <div key={r.tripId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{r.routeLabel}</span>
                  <span className="text-muted-foreground">
                    {r.booked}/{r.capacity} · {r.fillPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.fillPct}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                    className="h-full bg-grad-primary"
                  />
                </div>
              </div>
            ))}
            {d.routesFill.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No upcoming trips scheduled.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Recent bookings">
        <div className="space-y-2">
          {d.recentBookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <StatusPill tone={statusTone(b.status)}>{b.status}</StatusPill>
                <div>
                  <div className="font-medium">{b.studentName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.routeLabel} · Seat {b.seatLabel}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-grad-primary">
                  {formatGHS(b.amountPesewa)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(b.createdAt).toLocaleDateString("en-GH", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          ))}
          {d.recentBookings.length === 0 && (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function RoutesTab() {
  const q = useQuery({
    queryKey: ["admin", "routes"],
    queryFn: () => apiClient.admin.routes(),
  });
  const [search, setSearch] = useState("");
  const items = useMemo(() => {
    if (!q.data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return q.data.items;
    return q.data.items.filter(
      (r) =>
        r.originName.toLowerCase().includes(s) ||
        r.destName.toLowerCase().includes(s),
    );
  }, [q.data, search]);
  return (
    <Card
      title="Routes"
      action={
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-7"
            placeholder="Search routes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Route</th>
              <th className="py-2 pr-3">Operator</th>
              <th className="py-2 pr-3">Distance</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Stops</th>
              <th className="py-2 pr-3">Trips</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((r) => (
              <tr key={r.id} className="text-xs">
                <td className="py-2 pr-3 font-medium">
                  {r.originName} → {r.destName}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {r.operatorName}
                </td>
                <td className="py-2 pr-3">{r.distanceKm} km</td>
                <td className="py-2 pr-3">{r.durationMin}m</td>
                <td className="py-2 pr-3">{r.stops.length}</td>
                <td className="py-2 pr-3">{r.tripCount}</td>
                <td className="py-2">
                  <StatusPill
                    tone={r.active ? "success" : "neutral"}
                    dot
                  >
                    {r.active ? "Active" : "Inactive"}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BookingsTab() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin", "bookings", status, search],
    queryFn: () =>
      apiClient.admin.bookings({
        status,
        search: search || undefined,
        page: 1,
        pageSize: 50,
      }),
  });
  const counts = q.data?.counts ?? { ALL: 0 };
  const statuses = ["ALL", "HELD", "CONFIRMED", "CANCELLED", "REFUNDED", "COMPLETED"];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              status === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {s}{" "}
            <span className="ml-1 opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>
      <Card
        title="Bookings"
        action={
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7"
              placeholder="Search by name, phone, seat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      >
        {q.isLoading ? (
          <SkeletonRows />
        ) : q.data && q.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Passenger</th>
                  <th className="py-2 pr-3">Route</th>
                  <th className="py-2 pr-3">Seat</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {q.data.items.map((b) => (
                  <tr key={b.id} className="text-xs">
                    <td className="py-2 pr-3 font-medium">
                      {b.student?.user?.name ?? "—"}
                      <div className="text-[10px] text-muted-foreground">
                        {b.student?.user?.phone}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {b.trip
                        ? `${b.trip.route.originName} → ${b.trip.route.destName}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">{b.seat?.label ?? "—"}</td>
                    <td className="py-2 pr-3 font-semibold text-grad-primary">
                      {formatGHS(b.amountPesewa)}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusPill tone={statusTone(b.status)}>{b.status}</StatusPill>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString("en-GH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No bookings match"
            description="Try a different status or search term."
          />
        )}
      </Card>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState({
    autoConfirmPayments: true,
    smsNotifications: false,
    emailNotifications: false,
    pushNotifications: true,
    publicRoutes: true,
    pilotMode: true,
  });
  return (
    <Card title="Operator settings">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: "autoConfirmPayments", label: "Auto-confirm payments", desc: "Confirm sandbox payments automatically" },
          { key: "smsNotifications", label: "SMS notifications", desc: "Send SMS to students on booking" },
          { key: "emailNotifications", label: "Email notifications", desc: "Email copies of tickets" },
          { key: "pushNotifications", label: "Push notifications", desc: "Push live tracking alerts" },
          { key: "publicRoutes", label: "Public routes", desc: "List routes in search results" },
          { key: "pilotMode", label: "Pilot mode", desc: "Restrict to UCC students" },
        ].map((s) => (
          <div
            key={s.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <Label className="font-medium">{s.label}</Label>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <Switch
              checked={(settings as any)[s.key]}
              onCheckedChange={(v) =>
                setSettings((prev) => ({ ...prev, [s.key]: v }))
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AddRouteForm({ onClose }: { onClose: () => void }) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        import("sonner").then(({ toast }) =>
          toast.success("Route draft saved (demo only)"),
        );
        onClose();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ar-origin">Origin city</Label>
          <Input id="ar-origin" required placeholder="Cape Coast" />
        </div>
        <div>
          <Label htmlFor="ar-dest">Destination city</Label>
          <Input id="ar-dest" required placeholder="Accra" />
        </div>
        <div>
          <Label htmlFor="ar-distance">Distance (km)</Label>
          <Input id="ar-distance" type="number" required />
        </div>
        <div>
          <Label htmlFor="ar-duration">Duration (min)</Label>
          <Input id="ar-duration" type="number" required />
        </div>
        <div>
          <Label htmlFor="ar-price">Base price (pesewa)</Label>
          <Input id="ar-price" type="number" required />
        </div>
      </div>
      <Button type="submit" className="w-full bg-grad-primary">
        Save route
      </Button>
    </form>
  );
}

function KPI({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function statusTone(
  status: string,
): "primary" | "success" | "warning" | "danger" | "neutral" | "accent" {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
    case "SUCCESS":
      return "success";
    case "HELD":
    case "PENDING":
    case "INITIATED":
      return "warning";
    case "CANCELLED":
    case "FAILED":
    case "EXPIRED":
      return "danger";
    case "REFUNDED":
      return "accent";
    default:
      return "neutral";
  }
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-border bg-muted"
        />
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-md border border-border bg-muted"
        />
      ))}
    </div>
  );
}
