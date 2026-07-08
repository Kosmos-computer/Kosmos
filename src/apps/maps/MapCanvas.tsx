import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPlace, MapRoute } from "./types";
import { DEFAULT_VIEWPORT } from "./types";

interface MapCanvasProps {
  places: MapPlace[];
  selectedId: string | null;
  onSelectPlace: (id: string) => void;
  onViewportChange?: (viewbox: string) => void;
  route?: MapRoute | null;
}

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function placePinIcon(active: boolean): L.DivIcon {
  return L.divIcon({
    className: active ? "arco-maps__marker arco-maps__marker--active" : "arco-maps__marker",
    html: `<span class="arco-maps__marker-dot" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function endpointIcon(kind: "start" | "end"): L.DivIcon {
  return L.divIcon({
    className: `arco-maps__marker arco-maps__marker--${kind}`,
    html: `<span class="arco-maps__marker-dot" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Leaflet map wired to OpenStreetMap tiles, search markers, and route overlays. */
export function MapCanvas({ places, selectedId, onSelectPlace, onViewportChange, route }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const endpointMarkersRef = useRef<L.Marker[]>([]);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_VIEWPORT.center,
      zoom: DEFAULT_VIEWPORT.zoom,
      zoomControl: false,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("moveend", () => {
      if (!onViewportChange) return;
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const viewbox = [bounds.getWest(), bounds.getNorth(), bounds.getEast(), bounds.getSouth()].join(",");
        onViewportChange(viewbox);
      }, 350);
    });

    mapRef.current = map;
    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      routeLayerRef.current = null;
      endpointMarkersRef.current = [];
    };
  }, [onViewportChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(places.map((p) => p.id));
    for (const [id, marker] of markersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const place of places) {
      const active = place.id === selectedId;
      const existing = markersRef.current.get(place.id);
      if (existing) {
        existing.setIcon(placePinIcon(active));
        existing.setLatLng([place.lat, place.lon]);
      } else {
        const marker = L.marker([place.lat, place.lon], { icon: placePinIcon(active) })
          .addTo(map)
          .on("click", () => onSelectPlace(place.id));
        marker.bindTooltip(place.name, { direction: "top", offset: [0, -10] });
        markersRef.current.set(place.id, marker);
      }
    }
  }, [places, selectedId, onSelectPlace]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || route) return;
    if (!selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (!place) return;
    map.flyTo([place.lat, place.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [selectedId, places, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    for (const marker of endpointMarkersRef.current) marker.remove();
    endpointMarkersRef.current = [];

    if (!route) return;

    routeLayerRef.current = L.polyline(route.coordinates, {
      color: "#5b82ff",
      weight: 5,
      opacity: 0.85,
      lineJoin: "round",
    }).addTo(map);

    const start = L.marker([route.from.lat, route.from.lon], { icon: endpointIcon("start") })
      .addTo(map)
      .bindTooltip(route.from.name, { direction: "top", offset: [0, -10] });
    const end = L.marker([route.to.lat, route.to.lon], { icon: endpointIcon("end") })
      .addTo(map)
      .bindTooltip(route.to.name, { direction: "top", offset: [0, -10] });
    endpointMarkersRef.current = [start, end];

    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [48, 48] });
  }, [route]);

  return <div ref={containerRef} className="arco-maps__canvas" role="application" aria-label={i18n.t(I18nKey.APPS$MAPS_OPENSTREETMAP)} />;
}
