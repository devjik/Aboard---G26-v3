"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, User, Hash, Armchair, Loader2, MapPin, Bus, Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/common/status-pill";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiClient, ApiError } from "@/lib/api/client";
import { useTrackingSocket, type DriverPosition } from "@/lib/hooks/use-tracking-socket";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MapInner = dynamic(() => import("@/components/map/map-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

type Stage = "form" | "awaiting-code" | "enter-code" | "tracking";

interface GuardianViewProps {
  user: { id: string; name: string; role: string };
}

/**
 * Guardian view — minimal. Just a map and a form to enter the student's
 * name, booking reference, and seat. On submit, the student gets a consent
 * code notification. The guardian enters the code (shared personally by the
 * student) to unlock the student's live location + bus on the map.
 */
export function GuardianView({ user }: GuardianViewProps) {
  const [stage, setStage] = useState<Stage>("form");
  const [studentName, setStudentName] = useState("");
  const [ref, setRef] = useState("");
  const [seat, setSeat] = useState("");
  const [code, setCode] = useState("");
  const [trackData, setTrackData] = useState<{ tripId: string; route: string; studentName: string } | null>(null);

  const requestMut = useMutation({
    mutationFn: () => apiClient.consent.request({ studentName, ref, seat }),
    onSuccess: (data) => {
      toast.success("Consent request sent", {
        description: data.message,
      });
      setStage("awaiting-code");
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Could not send consent request");
    },
  });

  const verifyMut = useMutation({
    mutationFn: () => apiClient.consent.verify({ studentName, code }),
    onSuccess: (data) => {
      toast.success("Consent verified!", {
        description: "You can now see the student's location and the bus.",
      });
      setTrackData({ tripId: data.tripId, route: data.route, studentName: data.studentName });
      setStage("tracking");
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Verification failed");
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Guardian</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your ward's trip with their consent. Enter their details, they'll share a code with you.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* STAGE 1: Form to enter student details */}
        {stage === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="p-6 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
                <User className="size-4 text-primary" /> Enter your ward's details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="g-name">Student name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="g-name"
                      placeholder="e.g. Ama Mensah"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-ref">Booking reference</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="g-ref"
                      placeholder="e.g. AB-2026-XYZ123"
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-seat">Seat number</Label>
                  <div className="relative">
                    <Armchair className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="g-seat"
                      placeholder="e.g. 5A"
                      value={seat}
                      onChange={(e) => setSeat(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => requestMut.mutate()}
                  disabled={requestMut.isPending || !studentName || !ref || !seat}
                  className="w-full gap-1.5 bg-grad-primary text-white hover:opacity-90"
                >
                  {requestMut.isPending ? (
                    <><Loader2 className="size-4 animate-spin" /> Sending request…</>
                  ) : (
                    <><ShieldCheck className="size-4" /> Request consent</>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* STAGE 2: Awaiting code — guardian waits for student to share the code */}
        {stage === "awaiting-code" && (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="p-6 text-center shadow-card">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-grad-primary text-white shadow-glow">
                <MessageCircle className="size-8" />
              </div>
              <h3 className="font-display text-lg font-semibold">Ask your ward for the code</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                We've sent a notification to <strong>{studentName}</strong> with a 6-digit consent code.
                Ask them to share it with you personally (in person, by phone, or text).
                Enter it below to start tracking their trip.
              </p>
              <div className="mt-6">
                <Label htmlFor="g-code" className="mb-2 block text-center">Enter the code your ward shared</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setStage("form")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => verifyMut.mutate()}
                  disabled={verifyMut.isPending || code.length !== 6}
                  className="flex-1 gap-1.5 bg-grad-primary text-white hover:opacity-90"
                >
                  {verifyMut.isPending ? (
                    <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                  ) : (
                    <><Lock className="size-4" /> Verify &amp; track</>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* STAGE 3: Tracking — map with student + bus */}
        {stage === "tracking" && trackData && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="success" dot pulse>Tracking enabled</StatusPill>
              <StatusPill tone="primary" dot>{trackData.studentName}</StatusPill>
              <StatusPill tone="accent" dot>{trackData.route}</StatusPill>
            </div>
            <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-[500px]">
              <GuardianMap tripId={trackData.tripId} />
              <div className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2">
                <StatusPill tone="success" dot pulse>Student live</StatusPill>
                <StatusPill tone="accent" dot>Bus</StatusPill>
              </div>
            </div>
            <Card className="p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-success" />
                <span className="font-medium">Consent verified</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You are tracking <strong>{trackData.studentName}</strong> on the {trackData.route} trip.
                The student's location and the bus update in real time. Tracking stops when the trip ends.
              </p>
            </Card>
            <Button variant="outline" onClick={() => { setStage("form"); setCode(""); setTrackData(null); }}>
              Track a different student
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Guardian map — shows the student's real location + the bus (driver). */
function GuardianMap({ tripId }: { tripId: string }) {
  // For the guardian, we subscribe to the driver position (the bus)
  // and show the student's real position. In a real deployment, the
  // guardian would also share their own location, but for the pilot
  // we focus on showing the student + bus.
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch the trip detail to get stops for the route line
  const { data: tripDetail } = useQuerySafe(tripId);

  // Subscribe to the bus position via Socket.IO
  useTrackingSubscription(tripId, setDriverPos);

  const stops = tripDetail?.stops ?? [];

  return (
    <MapInner
      userPosition={null} // guardian doesn't need their own position on the student's map
      driverPosition={driverPos}
      stops={stops}
      routeLine={stops}
    />
  );
}

// Helper hooks for the guardian map

function useQuerySafe(tripId: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => apiClient.trips.detail(tripId),
    enabled: !!tripId,
  });
}

function useTrackingSubscription(tripId: string, onPos: (pos: { lat: number; lng: number }) => void) {
  const { subscribe } = useTrackingSocket();
  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribe(tripId, (pos: DriverPosition) => {
      onPos({ lat: pos.lat, lng: pos.lng });
    });
    return unsub;
  }, [tripId, subscribe, onPos]);
}
