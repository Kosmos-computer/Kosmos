import type { MapPlace, MapRoute } from "./types";

interface SearchOptions {
  viewbox?: string;
  bounded?: boolean;
  limit?: number;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${res.status})`;
}

export async function searchPlaces(q: string, options?: SearchOptions): Promise<MapPlace[]> {
  const params = new URLSearchParams({ q });
  if (options?.viewbox) {
    params.set("viewbox", options.viewbox);
    if (options.bounded) params.set("bounded", "1");
  }
  if (options?.limit) params.set("limit", String(options.limit));

  const res = await fetch(`/api/maps/search?${params}`);
  if (!res.ok) throw new Error(await readApiError(res, "Search failed"));
  return (await res.json()) as MapPlace[];
}

export async function geocodePlace(q: string): Promise<MapPlace | null> {
  const params = new URLSearchParams({ q });
  const res = await fetch(`/api/maps/geocode?${params}`);
  if (!res.ok) throw new Error(await readApiError(res, "Geocoding failed"));
  const body = (await res.json()) as MapPlace | null;
  return body;
}

export async function fetchDrivingRoute(from: MapPlace, to: MapPlace): Promise<MapRoute> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLon: String(from.lon),
    toLat: String(to.lat),
    toLon: String(to.lon),
    fromName: from.name,
    toName: to.name,
  });
  const res = await fetch(`/api/maps/route?${params}`);
  if (!res.ok) throw new Error(await readApiError(res, "Directions failed"));
  return (await res.json()) as MapRoute;
}
