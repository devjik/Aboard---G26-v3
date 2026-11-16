"use client";

import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  MapRoute,
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

/** Compute center [lng, lat] and zoom from a set of points. */
function computeViewport(points: Array<{ lat: number; lng: number }>): {
  center: [number, number];
  zoom: number;
} {
  if (points.length === 0) {
    return { center: [-1.2466, 5.1053], zoom: 7 }; // Cape Coast default
  }
  if (points.length === 1) {
    return { center: [points[0].lng, points[0].lat], zoom: 10 };
  }
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const span = Math.max(maxLng - minLng, maxLat - minLat);
  // Rough zoom heuristic based on degree span
  let zoom = 7;
  if (span > 5) zoom = 5;
  else if (span > 2) zoom = 6;
  else if (span > 1) zoom = 7;
  else if (span > 0.5) zoom = 9;
  else if (span > 0.1) zoom = 11;
  else zoom = 13;
  return { center: [centerLng, centerLat], zoom };
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

  // Compute center + zoom directly from points (no fitBounds needed)
  const { center, zoom } = computeViewport(allPoints);

  // maplibre [lng, lat] pairs for the route
  const routeCoords: [number, number][] = line.map((p) => [p.lng, p.lat]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Map
        center={center}
        zoom={zoom}
        theme={mapTheme}
        scrollZoom={false}
        className="h-[420px] w-full overflow-hidden rounded-2xl border border-border"
        attributionControl
      >
        <MapControls showZoom showLocate={false} showFullscreen={false} />

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
