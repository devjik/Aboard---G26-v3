"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface DriverPosition {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  ts: string;
  tripId: string;
}

/**
 * Real-time tracking hook using Supabase Realtime Broadcast.
 *
 * Replaces the previous Socket.IO implementation. Uses ephemeral
 * Broadcast channels (positions are not persisted — they're broadcast
 * and received in real-time only).
 *
 * Channel naming: `trip:<tripId>` — only users who know the tripId
 * can subscribe. For production with strict access control, add
 * Realtime Authorization webhooks (see Supabase docs).
 *
 * If Supabase is not configured (no env vars), falls back to a
 * disconnected state — the RealMapView will use simulated driver
 * positions instead.
 */
export function useTrackingSocket() {
  const [connected, setConnected] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const supabase = getSupabase();
    if (supabase) {
      // Supabase Realtime auto-connects and auto-reconnects.
      // We mark as connected once the client is created.
      setConnected(true);
    } else {
      // Supabase not configured — simulation mode
      setConnected(false);
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Driver: broadcast current GPS for a trip */
  const broadcastPosition = useCallback(
    (
      tripId: string,
      lat: number,
      lng: number,
      opts?: { speed?: number; heading?: number; accuracy?: number },
    ) => {
      const supabase = getSupabase();
      if (!supabase) return; // no-op if not configured

      const channel = supabase.channel(`trip:${tripId}`);
      channel.send({
        type: "broadcast",
        event: "driver:location",
        payload: {
          tripId,
          lat,
          lng,
          speed: opts?.speed,
          heading: opts?.heading,
          accuracy: opts?.accuracy,
          recordedAt: new Date().toISOString(),
        },
      });
    },
    [],
  );

  /** Driver: stop broadcasting (bus arrived / trip ended) */
  const stopBroadcast = useCallback((tripId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.channel(`trip:${tripId}`).send({
      type: "broadcast",
      event: "driver:stop",
      payload: { tripId },
    });
  }, []);

  /** Student/Parent: subscribe to a trip's driver positions */
  const subscribe = useCallback(
    (
      tripId: string,
      onPosition: (pos: DriverPosition) => void,
      onStopped?: () => void,
    ) => {
      const supabase = getSupabase();
      if (!supabase) {
        // Not configured — return no-op cleanup
        return () => {};
      }

      const channel = supabase.channel(`trip:${tripId}`);

      channel.on("broadcast", { event: "driver:location" }, (msg: any) => {
        if (msg?.payload) {
          onPosition(msg.payload as DriverPosition);
        }
      });

      channel.on("broadcast", { event: "driver:stop" }, () => {
        onStopped?.();
      });

      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED" && mounted.current) {
          setConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (mounted.current) setConnected(false);
        }
      });

      // Cleanup: remove the channel when the subscriber unmounts
      return () => {
        supabase.removeChannel(channel);
      };
    },
    [],
  );

  return { connected, broadcastPosition, stopBroadcast, subscribe };
}

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Boarding threshold in meters — when student is this close to driver, notify parent. */
export const BOARDING_THRESHOLD_M = 200;

/** Whether Supabase Realtime is available (for UI indicators). */
export const realtimeEnabled = isSupabaseConfigured();
