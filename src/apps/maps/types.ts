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
  /** Leaflet-ready [lat, lon] pairs. */
  coordinates: [number, number][];
  steps: MapRouteStep[];
  from: MapPlace;
  to: MapPlace;
}

export type MapsMode = "search" | "directions";

export type MapHistoryKind = "place" | "route";

export interface MapHistoryEntry {
  id: string;
  kind: MapHistoryKind;
  visitedAt: number;
  query?: string;
  place?: MapPlace;
  route?: MapRoute;
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

export const DEFAULT_VIEWPORT: MapViewport = {
  center: [32.7157, -117.1611],
  zoom: 12,
};

export const CURRENT_LOCATION_ID = "current-location";

export function currentLocationPlace(lat: number, lon: number): MapPlace {
  return {
    id: CURRENT_LOCATION_ID,
    name: "Current location",
    category: "Your location",
    address: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    lat,
    lon,
  };
}
