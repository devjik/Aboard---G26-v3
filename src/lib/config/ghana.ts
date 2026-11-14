// Ghana regions, capitals and inter-city route seeds for the Aboard pilot.
// Coordinates are approximate city-center latitudes/longitudes (WGS84).

export type RegionName =
  | "Ahafo"
  | "Ashanti"
  | "Bono"
  | "Bono East"
  | "Central"
  | "Eastern"
  | "Greater Accra"
  | "North East"
  | "Northern"
  | "Oti"
  | "Savannah"
  | "Upper East"
  | "Upper West"
  | "Volta"
  | "Western"
  | "Western North";

export interface GhanaRegion {
  name: RegionName;
  capital: string;
  lat: number;
  lng: number;
}

export const GHANA_REGIONS: GhanaRegion[] = [
  { name: "Ahafo", capital: "Goaso", lat: 6.4092, lng: -2.5394 },
  { name: "Ashanti", capital: "Kumasi", lat: 6.6666, lng: -1.6163 },
  { name: "Bono", capital: "Sunyani", lat: 7.3399, lng: -2.3268 },
  { name: "Bono East", capital: "Techiman", lat: 7.5833, lng: -1.9333 },
  { name: "Central", capital: "Cape Coast", lat: 5.1053, lng: -1.2466 },
  { name: "Eastern", capital: "Koforidua", lat: 6.0759, lng: -0.2686 },
  { name: "Greater Accra", capital: "Accra", lat: 5.6037, lng: -0.1870 },
  { name: "North East", capital: "Nalerigu", lat: 10.5289, lng: -0.3589 },
  { name: "Northern", capital: "Tamale", lat: 9.4035, lng: -0.8423 },
  { name: "Oti", capital: "Dambai", lat: 7.7825, lng: 0.1720 },
  { name: "Savannah", capital: "Damongo", lat: 9.0833, lng: -1.8167 },
  { name: "Upper East", capital: "Bolgatanga", lat: 10.7856, lng: -0.8589 },
  { name: "Upper West", capital: "Wa", lat: 10.0607, lng: -2.5099 },
  { name: "Volta", capital: "Ho", lat: 6.6000, lng: 0.4700 },
  { name: "Western", capital: "Takoradi", lat: 4.8980, lng: -1.7608 },
  { name: "Western North", capital: "Wiawso", lat: 5.9667, lng: -2.4833 },
];

export const REGION_NAMES: RegionName[] = GHANA_REGIONS.map((r) => r.name);

// Extra towns (non-capitals) used by route seeds. Coordinates are approximate
// city-center latitudes/longitudes (WGS84).
const EXTRA_TOWNS: Record<
  string,
  { lat: number; lng: number; region: RegionName }
> = {
  Kasoa: { lat: 5.5350, lng: -0.4260, region: "Central" },
  "Assin Fosu": { lat: 5.8667, lng: -1.2833, region: "Central" },
  Nsawam: { lat: 5.8167, lng: -0.3500, region: "Eastern" },
};

export type StopType = "ORIGIN" | "STOP" | "DEST";

export interface RouteStop {
  name: string;
  region: RegionName;
  lat: number;
  lng: number;
  offsetMin: number;
  type: StopType;
}

export interface RouteSeed {
  id: string;
  originName: string;
  originRegion: RegionName;
  destName: string;
  destRegion: RegionName;
  distanceKm: number;
  durationMin: number;
  pricePesewa: number;
  stops: RouteStop[];
}

// Helper to look up a city's coordinates by name (region capital or extra town).
function coordOf(city: string): { lat: number; lng: number } {
  const r = GHANA_REGIONS.find((reg) => reg.capital === city);
  if (r) return { lat: r.lat, lng: r.lng };
  const extra = EXTRA_TOWNS[city];
  if (extra) return { lat: extra.lat, lng: extra.lng };
  throw new Error(`Unknown Ghana city: ${city}`);
}

function buildStops(
  path: Array<{ city: string; region: RegionName; offsetMin: number }>,
): RouteStop[] {
  return path.map((p, i) => {
    const { lat, lng } = coordOf(p.city);
    return {
      name: p.city,
      region: p.region,
      lat,
      lng,
      offsetMin: p.offsetMin,
      type: i === 0 ? "ORIGIN" : i === path.length - 1 ? "DEST" : "STOP",
    };
  });
}

export const ROUTE_SEEDS: RouteSeed[] = [
  {
    id: "cape-coast-accra",
    originName: "Cape Coast",
    originRegion: "Central",
    destName: "Accra",
    destRegion: "Greater Accra",
    distanceKm: 145,
    durationMin: 165,
    pricePesewa: 4500,
    stops: buildStops([
      { city: "Cape Coast", region: "Central", offsetMin: 0 },
      { city: "Kasoa", region: "Central", offsetMin: 70 },
      { city: "Accra", region: "Greater Accra", offsetMin: 165 },
    ]),
  },
  {
    id: "accra-cape-coast",
    originName: "Accra",
    originRegion: "Greater Accra",
    destName: "Cape Coast",
    destRegion: "Central",
    distanceKm: 145,
    durationMin: 165,
    pricePesewa: 4500,
    stops: buildStops([
      { city: "Accra", region: "Greater Accra", offsetMin: 0 },
      { city: "Kasoa", region: "Central", offsetMin: 90 },
      { city: "Cape Coast", region: "Central", offsetMin: 165 },
    ]),
  },
  {
    id: "cape-coast-takoradi",
    originName: "Cape Coast",
    originRegion: "Central",
    destName: "Takoradi",
    destRegion: "Western",
    distanceKm: 90,
    durationMin: 105,
    pricePesewa: 2500,
    stops: buildStops([
      { city: "Cape Coast", region: "Central", offsetMin: 0 },
      { city: "Takoradi", region: "Western", offsetMin: 105 },
    ]),
  },
  {
    id: "cape-coast-kumasi",
    originName: "Cape Coast",
    originRegion: "Central",
    destName: "Kumasi",
    destRegion: "Ashanti",
    distanceKm: 195,
    durationMin: 220,
    pricePesewa: 5500,
    stops: buildStops([
      { city: "Cape Coast", region: "Central", offsetMin: 0 },
      { city: "Assin Fosu", region: "Central", offsetMin: 70 },
      { city: "Kumasi", region: "Ashanti", offsetMin: 220 },
    ]),
  },
  {
    id: "accra-kumasi",
    originName: "Accra",
    originRegion: "Greater Accra",
    destName: "Kumasi",
    destRegion: "Ashanti",
    distanceKm: 250,
    durationMin: 270,
    pricePesewa: 7000,
    stops: buildStops([
      { city: "Accra", region: "Greater Accra", offsetMin: 0 },
      { city: "Nsawam", region: "Eastern", offsetMin: 40 },
      { city: "Kumasi", region: "Ashanti", offsetMin: 270 },
    ]),
  },
  {
    id: "kumasi-accra",
    originName: "Kumasi",
    originRegion: "Ashanti",
    destName: "Accra",
    destRegion: "Greater Accra",
    distanceKm: 250,
    durationMin: 270,
    pricePesewa: 7000,
    stops: buildStops([
      { city: "Kumasi", region: "Ashanti", offsetMin: 0 },
      { city: "Nsawam", region: "Eastern", offsetMin: 220 },
      { city: "Accra", region: "Greater Accra", offsetMin: 270 },
    ]),
  },
  {
    id: "accra-ho",
    originName: "Accra",
    originRegion: "Greater Accra",
    destName: "Ho",
    destRegion: "Volta",
    distanceKm: 180,
    durationMin: 210,
    pricePesewa: 5000,
    stops: buildStops([
      { city: "Accra", region: "Greater Accra", offsetMin: 0 },
      { city: "Ho", region: "Volta", offsetMin: 210 },
    ]),
  },
  {
    id: "accra-takoradi",
    originName: "Accra",
    originRegion: "Greater Accra",
    destName: "Takoradi",
    destRegion: "Western",
    distanceKm: 220,
    durationMin: 240,
    pricePesewa: 6000,
    stops: buildStops([
      { city: "Accra", region: "Greater Accra", offsetMin: 0 },
      { city: "Cape Coast", region: "Central", offsetMin: 120 },
      { city: "Takoradi", region: "Western", offsetMin: 240 },
    ]),
  },
  {
    id: "kumasi-tamale",
    originName: "Kumasi",
    originRegion: "Ashanti",
    destName: "Tamale",
    destRegion: "Northern",
    distanceKm: 405,
    durationMin: 480,
    pricePesewa: 12000,
    stops: buildStops([
      { city: "Kumasi", region: "Ashanti", offsetMin: 0 },
      { city: "Techiman", region: "Bono East", offsetMin: 180 },
      { city: "Tamale", region: "Northern", offsetMin: 480 },
    ]),
  },
  {
    id: "kumasi-sunyani",
    originName: "Kumasi",
    originRegion: "Ashanti",
    destName: "Sunyani",
    destRegion: "Bono",
    distanceKm: 145,
    durationMin: 175,
    pricePesewa: 4000,
    stops: buildStops([
      { city: "Kumasi", region: "Ashanti", offsetMin: 0 },
      { city: "Sunyani", region: "Bono", offsetMin: 175 },
    ]),
  },
];
