"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bus, Play, Square, MapPin, Radio, Loader2, Navigation, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/common/status-pill";
import { apiClient } from "@/lib/api/client";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useTrackingSocket } from "@/lib/hooks/use-tracking-socket";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DriverModeProps {
  user: { id: string; name: string; role: string };
}

export function DriverMode({ user }: DriverModeProps) {
  const geo = useGeolocation();
  const { connected, broadcastPosition, stopBroadcast } = useTrackingSocket();
  const [driving, setDriving] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tripsQ = useQuery({
    queryKey: ["trips", "driver", user.id],
    queryFn: () => apiClient.trips.search({ page: 1, pageSize: 10 }),
  });

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const trips = tripsQ.data?.items ?? [];

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) setSelectedTripId(trips[0].id);
  }, [trips, selectedTripId]);

  const startDriving = () => {
    if (!selectedTripId) { toast.error("Select a trip first"); return; }
    if (geo.permission !== "granted" && !geo.point) {
      geo.request();
      toast.info("Allow location access to start driving");
      return;
    }
    setDriving(true);
    toast.success("Driving started", { description: "Your live position is now the bus position for all students." });
    if (geo.point) {
      broadcastPosition(selectedTripId, geo.point.lat, geo.point.lng, { accuracy: geo.point.accuracy, heading: geo.point.heading ?? undefined, speed: geo.point.speed ?? undefined });
      setLastBroadcast({ lat: geo.point.lat, lng: geo.point.lng, ts: Date.now() });
    }
    intervalRef.current = setInterval(() => {
      if (geo.point) {
        broadcastPosition(selectedTripId, geo.point.lat, geo.point.lng, { accuracy: geo.point.accuracy, heading: geo.point.heading ?? undefined, speed: geo.point.speed ?? undefined });
        setLastBroadcast({ lat: geo.point.lat, lng: geo.point.lng, ts: Date.now() });
      }
    }, 4000);
  };

  const stopDriving = () => {
    setDriving(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (selectedTripId) stopBroadcast(selectedTripId);
    toast.info("Driving stopped", { description: "Students will see the bus has arrived." });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (selectedTripId) stopBroadcast(selectedTripId);
    };
  }, [selectedTripId, stopBroadcast]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Driver Mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.name} · Your live GPS becomes the bus position for all students.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusPill tone={connected ? "success" : "neutral"} dot pulse={connected}>{connected ? "Tracking connected" : "Connecting…"}</StatusPill>
        {geo.point && <StatusPill tone="primary" dot pulse>GPS active · ±{Math.round(geo.point.accuracy ?? 0)}m</StatusPill>}
        {driving && <StatusPill tone="success" dot pulse>Broadcasting live</StatusPill>}
      </div>

      <Card className="mb-4 p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold"><Bus className="size-4 text-primary" /> Select your trip</h3>
        {tripsQ.isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trips assigned yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {trips.slice(0, 6).map((t) => (
              <button key={t.id} onClick={() => setSelectedTripId(t.id)} disabled={driving}
                className={cn("flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors disabled:opacity-50",
                  selectedTripId === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                <div>
                  <div className="font-medium"><MapPin className="mr-1 inline size-3 text-primary" />{t.originName} → {t.destName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.departureAt).toLocaleString("en-GH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                </div>
                {selectedTripId === t.id && <Radio className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div animate={driving ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}
            className={cn("flex size-20 items-center justify-center rounded-3xl text-white shadow-glow", driving ? "bg-grad-success" : "bg-grad-primary")}>
            <Bus className="size-9" />
          </motion.div>
          {driving ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">You're driving</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your live GPS is the bus position. Students see you in real time. When a student gets within 200m, their parent and admin are automatically notified.</p>
              </div>
              {lastBroadcast && (
                <div className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Last broadcast</span><span className="font-mono">{lastBroadcast.lat.toFixed(4)}, {lastBroadcast.lng.toFixed(4)}</span></div>
                  <div className="mt-1 flex items-center justify-between"><span className="text-muted-foreground">Updated</span><span>{Math.round((Date.now() - lastBroadcast.ts) / 1000)}s ago</span></div>
                </div>
              )}
              {/* Bus moving button — notifies all students + parents + admin */}
              <Button
                onClick={async () => {
                  if (!selectedTripId) return;
                  try {
                    const res = await apiClient.notifications.notifyTripStarted(selectedTripId);
                    toast.success("Bus moving notification sent!", {
                      description: `${res.studentsNotified} student(s), ${res.parentsNotified} parent(s), ${res.adminsNotified} admin(s) notified.`,
                    });
                  } catch (e: any) {
                    toast.error("Could not send notification", { description: e?.message });
                  }
                }}
                className="gap-1.5 bg-grad-accent text-white hover:opacity-90"
              >
                <Bus className="size-4" /> Notify: Bus is moving
              </Button>
              <Button onClick={stopDriving} variant="destructive" className="gap-1.5"><Square className="size-4" /> Stop driving</Button>
            </>
          ) : (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Ready to drive?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start driving to broadcast your GPS. Students on this trip will see your bus position live. When a student gets within 200m, their parent is automatically notified.</p>
              </div>
              <Button onClick={startDriving} disabled={!selectedTripId || !connected} className="gap-1.5 bg-grad-primary text-white hover:opacity-90"><Play className="size-4" /> Start driving</Button>
              {geo.permission !== "granted" && !geo.point && (
                <Button variant="outline" size="sm" onClick={() => geo.request()} className="gap-1.5"><Navigation className="size-3.5" /> Enable GPS first</Button>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: <Bus className="size-5" />, title: "1. Select trip", text: "Choose which trip you're driving today." },
          { icon: <Play className="size-5" />, title: "2. Start driving", text: "Your real GPS broadcasts as the bus position." },
          { icon: <Users className="size-5" />, title: "3. Auto-notify", text: "Students within 200m trigger parent boarding alerts." },
        ].map((s) => (
          <Card key={s.title} className="p-4">
            <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-grad-primary text-white">{s.icon}</div>
            <h4 className="text-sm font-semibold">{s.title}</h4>
            <p className="text-xs text-muted-foreground">{s.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
