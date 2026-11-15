"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { StopT } from "@/lib/api/contracts/trips";

export type GeoPermission =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  ts: number;
}

const SUPPORTED =
  typeof navigator !== "undefined" && "geolocation" in navigator;

export function useGeolocation() {
  const [permission, setPermission] = useState<GeoPermission>(
    SUPPORTED ? "unknown" : "unsupported",
  );
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const watchId = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (!SUPPORTED) return;
    if (watchId.current !== null) return; // already watching
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission("granted");
        setPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          ts: pos.timestamp,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
        } else {
          setPermission("prompt");
        }
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
    );
  }, []);

  useEffect(() => {
    if (!SUPPORTED) return;
    const anyNav = navigator as any;
    if (anyNav.permissions?.query) {
      anyNav.permissions
        .query({ name: "geolocation" })
        .then((p: any) => {
          const apply = () => {
            if (p?.state === "granted") {
              setPermission("granted");
              // permission already granted (e.g. via the sign-in modal) —
              // start watching immediately so the user's position appears
              // on the map the instant a trip is selected.
              startWatch();
            } else if (p?.state === "denied") {
              setPermission("denied");
            } else {
              setPermission("prompt");
            }
          };
          apply();
          // listen for future changes (e.g. user grants via the modal
          // while this hook is already mounted)
          p.onchange = apply;
        })
        .catch(() => undefined);
    }
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [startWatch]);

  function request() {
    if (!SUPPORTED) {
      setPermission("unsupported");
      return;
    }
    startWatch();
  }

  return { permission, point, request };
}

/**
 * Simulate a driver moving along a list of stops. Updates every 2 seconds.
 * Returns the driver's current {lat,lng} or null when stops is empty.
 */
export function useDriverSimulation(stops: StopT[]): {
  lat: number;
  lng: number;
} | null {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const idx = useRef(0);
  const t = useRef(0); // progress 0..1 between stops[idx] and stops[idx+1]

  useEffect(() => {
    if (!stops || stops.length < 2) {
      setPos(null);
      return;
    }
    setPos({ lat: stops[0].lat, lng: stops[0].lng });
    idx.current = 0;
    t.current = 0;
    const interval = setInterval(() => {
      const i = idx.current;
      const next = stops[i + 1];
      if (!next) {
        // Loop back to start
        idx.current = 0;
        t.current = 0;
        setPos({ lat: stops[0].lat, lng: stops[0].lng });
        return;
      }
      const cur = stops[i];
      t.current += 0.08;
      if (t.current >= 1) {
        t.current = 0;
        idx.current = i + 1;
        setPos({ lat: next.lat, lng: next.lng });
        return;
      }
      const lat = cur.lat + (next.lat - cur.lat) * t.current;
      const lng = cur.lng + (next.lng - cur.lng) * t.current;
      setPos({ lat, lng });
    }, 2000);
    return () => clearInterval(interval);
  }, [stops]);

  return pos;
}
