"use client";

import { useEffect } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  MapRoute,
  useMap,
  type Theme,
} from "@/components/ui/map";
import { useThemeStore } from "@/lib/theme";

/**
 * MapInner — mapcn (MapLibre GL) implementation.
 *
 * Replaces the previous react-leaflet version. Same props interface so
 * RealMapView doesn't change. Uses mapcn's CARTO basemap which auto-switches
 * light/dark — we pass the app's current mode explicitly to keep the map
 * in sync with the theme toggle.
 *
 * Note: maplibre uses [longitude, latitude] order (opposite of leaflet).
 */

const KEYFRAMES = `
@keyframes aboard-ping {
  0% { transform: scale(0.6); opacity: 0.85; }
  80%, 100% { transform: scale(2.4); opacity: 0; }
}
/* Keep maplibre panes below app overlays (z-50+) */
.maplibregl-map { z-index: 0 !important; }
.maplibregl-ctrl { z-index: 10 !important; }
`;

export interface MapInnerProps {
  userPosition?: { lat: number; lng: number; accuracy?: number } | null;
  driverPosition?: { lat: number; lng: number } | null;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    type?: string;
  }>;
  routeLine?: Array<{ lat: number; lng: number }>;
  className?: string;
}

/** FitBounds — child of <Map>, calls maplibre fitBounds on point changes. */
function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    // maplibre expects [lng, lat] pairs
    const lngLats = points.map((p) => [p.lng, p.lat] as [number, number]);
    const lngs = lngLats.map((c) => c[0]);
    const lats = lngLats.map((c) => c[1]);
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    // pad by ~25% so markers aren't at the very edge
    const padLng = (ne[0] - sw[0]) * 0.25 || 0.1;
    const padLat = (ne[1] - sw[1]) * 0.25 || 0.1;
    map.fitBounds(
      [
        [sw[0] - padLng, sw[1] - padLat],
        [ne[0] + padLng, ne[1] + padLat],
      ],
      { animate: true, duration: 800 },
    );
  }, [map, points]);
  return null;
}

export function MapInner({
  userPosition,
  driverPosition,
  stops,
  routeLine,
  className,
}: MapInnerProps) {
  const mode = useThemeStore((s) => s.mode);
  const mapTheme: Theme = mode === "dark" ? "dark" : "light";

  const allPoints: Array<{ lat: number; lng: number }> = [];
  if (userPosition) allPoints.push(userPosition);
  if (driverPosition) allPoints.push(driverPosition);
  for (const s of stops) allPoints.push(s);
  const line = routeLine ?? stops.map((s) => ({ lat: s.lat, lng: s.lng }));

  // maplibre [lng, lat] pairs for the route
  const routeCoords: [number, number][] = line.map((p) => [p.lng, p.lat]);

  // Default center: Cape Coast if no points
  const center: [number, number] = allPoints[0]
    ? [allPoints[0].lng, allPoints[0].lat]
    : [-1.2466, 5.1053];

  return (
    <div className={className} style={{ position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Map
        center={center}
        zoom={7}
        theme={mapTheme}
        scrollZoom={false}
        className="h-[420px] w-full overflow-hidden rounded-2xl border border-border"
        attributionControl
      >
        <MapControls showZoom showLocate showFullscreen={false} />

        <FitBounds points={allPoints} />

        {routeCoords.length > 1 && (
          <MapRoute
            coordinates={routeCoords}
            color="var(--primary, #b8895a)"
            width={3}
            dashArray={[8, 6]}
            opacity={0.85}
          />
        )}

        {/* Stop markers */}
        {stops.map((s, i) => (
          <MapMarker
            key={`stop-${i}`}
            longitude={s.lng}
            latitude={s.lat}
          >
            <MarkerContent>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "var(--primary, #b8895a)",
                  border: "2px solid white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }}
              />
            </MarkerContent>
            <MarkerPopup>
              <div style={{ fontSize: 12 }}>
                <strong>{s.name}</strong>
                <br />
                <span style={{ color: "var(--muted-foreground, #6b6253)" }}>
                  {s.type ?? "Stop"}
                </span>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* User position */}
        {userPosition && (
          <MapMarker
            longitude={userPosition.lng}
            latitude={userPosition.lat}
          >
            <MarkerContent>
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "#0ea5e9",
                  border: "2px solid white",
                  boxShadow: "0 0 0 6px rgba(14,165,233,0.25)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "rgba(14,165,233,0.45)",
                  animation: "aboard-ping 1.6s ease-out infinite",
                }}
              />
            </MarkerContent>
            <MarkerPopup>
              <div style={{ fontSize: 12 }}>
                <strong>You are here</strong>
                {typeof userPosition.accuracy === "number" && (
                  <>
                    <br />
                    <span style={{ color: "var(--muted-foreground, #6b6253)" }}>
                      ±{Math.round(userPosition.accuracy)}m accuracy
                    </span>
                  </>
                )}
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Driver position */}
        {driverPosition && (
          <MapMarker
            longitude={driverPosition.lng}
            latitude={driverPosition.lat}
          >
            <MarkerContent>
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: "var(--primary, #b8895a)",
                  border: "2px solid white",
                  boxShadow: "0 0 0 6px rgba(184,137,90,0.25)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                🚌
              </span>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "rgba(184,137,90,0.4)",
                  animation: "aboard-ping 1.6s ease-out infinite",
                }}
              />
            </MarkerContent>
            <MarkerPopup>
              <div style={{ fontSize: 12 }}>
                <strong>Your bus</strong>
                <br />
                <span style={{ color: "var(--muted-foreground, #6b6253)" }}>
                  Live GPS · updates every 4s
                </span>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}
      </Map>
    </div>
  );
}

export default MapInner;
