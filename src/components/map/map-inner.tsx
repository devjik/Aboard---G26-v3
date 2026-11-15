"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths under bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const KEYFRAMES = `@keyframes aboard-ping { 0% { transform: scale(0.6); opacity: 0.85; } 80%, 100% { transform: scale(2.4); opacity: 0; } }`;

function divIcon(html: string, className: string, size = 24): L.DivIcon {
  return L.divIcon({
    html,
    className,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userIcon = divIcon(
  `<span style="position:relative;display:inline-block;width:14px;height:14px;border-radius:999px;background:#0ea5e9;border:2px solid white;box-shadow:0 0 0 6px rgba(14,165,233,0.25);"></span><span style="position:absolute;inset:0;border-radius:999px;background:rgba(14,165,233,0.45);animation:aboard-ping 1.6s ease-out infinite;"></span>`,
  "aboard-leaflet-user-icon",
  14,
);

const driverIcon = divIcon(
  `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:var(--primary,#047857);border:2px solid white;box-shadow:0 0 0 6px rgba(4,120,87,0.25);color:white;font-size:10px;font-weight:bold;">🚌</span><span style="position:absolute;inset:0;border-radius:999px;background:rgba(4,120,87,0.45);animation:aboard-ping 1.6s ease-out infinite;"></span>`,
  "aboard-leaflet-driver-icon",
  24,
);

const stopIcon = divIcon(
  `<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f59e0b;border:2px solid white;"></span>`,
  "aboard-leaflet-stop-icon",
  10,
);

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

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  // refit whenever the set of points changes (e.g. new trip selected)
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    const padded = bounds.pad(0.25);
    map.fitBounds(padded, { animate: true });
  }, [points, map]);
  return null;
}

export function MapInner({
  userPosition,
  driverPosition,
  stops,
  routeLine,
  className,
}: MapInnerProps) {
  const allPoints: Array<{ lat: number; lng: number }> = [];
  if (userPosition) allPoints.push(userPosition);
  if (driverPosition) allPoints.push(driverPosition);
  for (const s of stops) allPoints.push(s);
  const line = routeLine ?? stops.map((s) => ({ lat: s.lat, lng: s.lng }));

  return (
    <div className={className} style={{ position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <MapContainer
        center={
          allPoints[0]
            ? [allPoints[0].lat, allPoints[0].lng]
            : [5.1053, -1.2466]
        }
        zoom={8}
        scrollWheelZoom={false}
        className="h-[420px] w-full overflow-hidden rounded-2xl border border-border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />
        {line.length > 1 && (
          <Polyline
            positions={line.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#047857", weight: 4, dashArray: "8 6" }}
          />
        )}
        {stops.map((s, i) => (
          <Marker
            key={i}
            position={[s.lat, s.lng]}
            icon={stopIcon}
          >
            <Popup>
              <strong>{s.name}</strong>
              <br />
              <span>{s.type ?? "Stop"}</span>
            </Popup>
          </Marker>
        ))}
        {userPosition && (
          <>
            <Marker
              position={[userPosition.lat, userPosition.lng]}
              icon={userIcon}
            >
              <Popup>You are here</Popup>
            </Marker>
            {typeof userPosition.accuracy === "number" && (
              <Circle
                center={[userPosition.lat, userPosition.lng]}
                radius={userPosition.accuracy}
                pathOptions={{
                  color: "#0ea5e9",
                  fillColor: "#0ea5e9",
                  fillOpacity: 0.08,
                }}
              />
            )}
          </>
        )}
        {driverPosition && (
          <Marker
            position={[driverPosition.lat, driverPosition.lng]}
            icon={driverIcon}
          >
            <Popup>
              <strong>Your bus</strong>
              <br />
              <span>Simulated GPS · updates every 4s</span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default MapInner;
