"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { TRACKING_SERVICE_PORT } from "@/lib/config/app";

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
 * Manages the Socket.IO connection to the tracking mini-service.
 * - Drivers call `broadcastPosition(tripId, lat, lng)` to send their GPS.
 * - Students call `subscribe(tripId)` and receive positions via `onPosition`.
 * - The connection URL uses `?XTransformPort=3003` per the Caddy gateway rule.
 */
export function useTrackingSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sock = io("/?XTransformPort=" + TRACKING_SERVICE_PORT, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = sock;

    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, []);

  /** Driver: broadcast current GPS for a trip */
  const broadcastPosition = useCallback(
    (tripId: string, lat: number, lng: number, opts?: { speed?: number; heading?: number; accuracy?: number }) => {
      socketRef.current?.emit("driver:location", {
        tripId,
        lat,
        lng,
        speed: opts?.speed,
        heading: opts?.heading,
        accuracy: opts?.accuracy,
        recordedAt: new Date().toISOString(),
      });
    },
    [],
  );

  /** Driver: stop broadcasting (bus arrived / trip ended) */
  const stopBroadcast = useCallback((tripId: string) => {
    socketRef.current?.emit("driver:stop", tripId);
  }, []);

  /** Student: subscribe to a trip's driver positions */
  const subscribe = useCallback((tripId: string, onPosition: (pos: DriverPosition) => void, onStopped?: () => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.emit("subscribe:trip", tripId);
    const posHandler = (payload: DriverPosition) => onPosition(payload);
    const stopHandler = () => onStopped?.();
    sock.on("trip:location", posHandler);
    sock.on("trip:stopped", stopHandler);
    return () => {
      sock.emit("unsubscribe:trip", tripId);
      sock.off("trip:location", posHandler);
      sock.off("trip:stopped", stopHandler);
    };
  }, []);

  return { connected, broadcastPosition, stopBroadcast, subscribe };
}

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
