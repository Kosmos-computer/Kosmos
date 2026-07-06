/**
 * OpenStreetMap search + routing — proxied server-side for User-Agent policy
 * (Nominatim) and to avoid browser CORS limits (OSRM).
 */
import { formatDistance, formatDuration, formatStepInstruction } from "../../shared/maps/format.js";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const USER_AGENT = "ArcoOS-Prototype/0.1 (local dev; https://github.com/arco-os)";

export interface MapPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lon: number;
}

export interface MapRouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export interface MapRoute {
  distance: string;
  duration: string;
  coordinates: [number, number][];
  steps: MapRouteStep[];
  from: MapPlace;
  to: MapPlace;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  name?: string;
  address?: Record<string, string>;
}

let lastRequestAt = 0;

async function nominatimFetch(path: string): Promise<NominatimResult[]> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastRequestAt = Date.now();

  const res = await fetch(`${NOMINATIM_BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Nominatim error (${res.status})`);
  return (await res.json()) as NominatimResult[];
}

function formatAddress(item: NominatimResult): string {
  const parts = item.address;
  if (!parts) return item.display_name;
  const street = [parts.house_number, parts.road].filter(Boolean).join(" ");
  const city = parts.city ?? parts.town ?? parts.village ?? parts.suburb;
  return [street, city, parts.state, parts.country].filter(Boolean).join(", ") || item.display_name;
}

function toPlace(item: NominatimResult): MapPlace {
  const category = [item.class, item.type].filter(Boolean).join(" · ") || "Place";
  return {
    id: String(item.place_id),
    name: item.name ?? item.display_name.split(",")[0]?.trim() ?? item.display_name,
    category,
    address: formatAddress(item),
    lat: Number(item.lat),
    lon: Number(item.lon),
  };
}

export async function searchPlaces(
  query: string,
  options?: { viewbox?: string; bounded?: boolean; limit?: number },
): Promise<MapPlace[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(options?.limit ?? 12),
  });
  if (options?.viewbox) {
    params.set("viewbox", options.viewbox);
    if (options.bounded) params.set("bounded", "1");
  }

  const results = await nominatimFetch(`/search?${params}`);
  return results.map(toPlace);
}

export async function geocodePlace(query: string): Promise<MapPlace | null> {
  const results = await searchPlaces(query, { limit: 1 });
  return results[0] ?? null;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: Array<{
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: { type: string; modifier?: string };
      }>;
    }>;
  }>;
}

export async function getDrivingRoute(
  from: MapPlace,
  to: MapPlace,
): Promise<MapRoute> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "true",
  });

  const res = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Routing error (${res.status})`);

  const body = (await res.json()) as OsrmRouteResponse;
  if (body.code !== "Ok" || !body.routes?.[0]) {
    throw new Error("No driving route found between these locations");
  }

  const route = body.routes[0];
  const coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
  const steps = route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      instruction: formatStepInstruction(step.maneuver.type, step.maneuver.modifier, step.name),
      distance: formatDistance(step.distance),
      duration: formatDuration(step.duration),
    })),
  );

  return {
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    coordinates,
    steps,
    from,
    to,
  };
}
