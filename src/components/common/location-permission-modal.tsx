"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LocateFixed, MapPin, ShieldCheck, X, Loader2, Navigation, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type GeoPermissionState = "unknown" | "prompting" | "granted" | "denied" | "unsupported";

interface LocationPermissionModalProps {
  /** When true, the modal shows and triggers the browser geolocation prompt. */
  open: boolean;
  /** Called when the user dismisses the modal (skip or close). */
  onClose: () => void;
  /** Called when location is granted — tracking is now active. */
  onGranted?: () => void;
}

/**
 * Auto-pops after sign-in to request GPS permission.
 * Triggers the browser's native geolocation prompt and shows the result.
 * On grant, calls onGranted (which unlocks the Live Map tracking).
 * The user can skip — they can still see the driver on the map, just not
 * their own position.
 */
export function LocationPermissionModal({ open, onClose, onGranted }: LocationPermissionModalProps) {
  const [state, setState] = useState<GeoPermissionState>("unknown");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setState("granted");
        toast.success("Location access granted", {
          description: "Live tracking is now active — your bus position will appear on the map.",
        });
        onGranted?.();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          toast.error("Location permission denied", {
            description: "You can still track the driver's bus, but your position won't show on the map.",
          });
        } else {
          setState("denied");
          toast.error("Could not get your location", { description: err.message });
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [onGranted]);

  // Auto-trigger the browser prompt when the modal opens
  useEffect(() => {
    if (open && state === "unknown") {
      // Small delay so the modal animates in first
      const t = setTimeout(() => requestLocation(), 400);
      return () => clearTimeout(t);
    }
  }, [open, state, requestLocation]);

  const handleClose = () => {
    onClose();
    // reset state so re-opening works
    setTimeout(() => {
      if (state !== "granted") setState("unknown");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-card sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            {/* close */}
            <button onClick={handleClose} className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
              <X className="size-5" />
            </button>

            {state === "prompting" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                  <div className="relative flex size-16 items-center justify-center rounded-2xl bg-grad-primary text-white shadow-glow">
                    <LocateFixed className="size-8" />
                  </div>
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Waiting for location permission…</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your browser should be showing a location prompt. Tap "Allow" to enable live tracking.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Waiting…
                </div>
              </div>
            )}

            {state === "granted" && coords && (
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className="flex size-16 items-center justify-center rounded-2xl bg-grad-success text-white shadow-glow"
                >
                  <ShieldCheck className="size-8" />
                </motion.div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Location access granted</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live tracking is now active. Your real position and the driver's bus will both appear on the map.
                  </p>
                </div>
                <div className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your coordinates</span>
                    <span className="font-mono font-semibold">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-semibold">±{Math.round(coords.accuracy ?? 0)}m</span>
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full gap-1.5 bg-grad-primary text-white hover:opacity-90">
                  <Bus className="size-4" /> Go to live map
                </Button>
              </div>
            )}

            {state === "denied" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <MapPin className="size-8" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Location permission denied</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You can still see the driver's bus on the map, but your position won't show. To enable later, click the location icon in your browser's address bar.
                  </p>
                </div>
                <div className="flex w-full gap-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Skip for now
                  </Button>
                  <Button onClick={requestLocation} className="flex-1 gap-1.5 bg-grad-primary text-white hover:opacity-90">
                    <Navigation className="size-4" /> Try again
                  </Button>
                </div>
              </div>
            )}

            {state === "unsupported" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <MapPin className="size-8" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Geolocation not supported</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your browser doesn't support geolocation. You can still track the driver's bus on the map.
                  </p>
                </div>
                <Button onClick={handleClose} className="w-full bg-grad-primary text-white hover:opacity-90">
                  Continue
                </Button>
              </div>
            )}

            {state === "unknown" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-grad-primary text-white shadow-glow">
                  <LocateFixed className="size-8" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Allow location for live tracking</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aboard uses your GPS to show how far the bus is from your pickup stop. Your location is only visible to you and (with consent) linked parents while a trip is active.
                  </p>
                </div>
                <Button onClick={requestLocation} className="w-full gap-1.5 bg-grad-primary text-white hover:opacity-90">
                  <LocateFixed className="size-4" /> Allow location access
                </Button>
                <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground">
                  Skip for now
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
