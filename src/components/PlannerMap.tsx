import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";

type LeafletModule = typeof Leaflet;

const createDefaultIcon = (L: LeafletModule) => L.divIcon({
  className: "masari-pin",
  html: `<div style="
    width: 32px; height: 40px; position: relative;
    transform: translate(-50%, -100%);
  ">
    <svg viewBox="0 0 32 40" width="32" height="40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="oklch(0.62 0.13 195)"/>
          <stop offset="1" stop-color="oklch(0.42 0.09 200)"/>
        </linearGradient>
      </defs>
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="url(#pg)"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

const createStopIcon = (L: LeafletModule, n: number) => L.divIcon({
  className: "masari-stop-pin",
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, oklch(0.78 0.14 80), oklch(0.68 0.15 65));
    color: oklch(0.2 0.04 60); font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 2px solid white;
    box-shadow: 0 4px 12px oklch(0.18 0.025 200 / 0.25);
    font-family: Inter, sans-serif;
  ">${n}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export type MapStop = { lat: number; lng: number; title: string; n: number };

function kmBetween(a: MapStop, b: MapStop) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function legEstimate(from: MapStop, to: MapStop) {
  const distanceKm = Math.round(kmBetween(from, to) * 1.45 * 10) / 10;
  const minutes = Math.max(3, Math.round((distanceKm / 24) * 60 + 5));
  const traffic = minutes / Math.max(distanceKm, 0.2) > 4 ? "traffic" : "normal";
  return { distanceKm, minutes, traffic };
}

function routeTraffic(distanceMeters: number | undefined, durationSeconds: number | undefined) {
  if (!distanceMeters || !durationSeconds) return undefined;
  const km = distanceMeters / 1000;
  const minutes = durationSeconds / 60;
  return minutes / Math.max(km, 0.2) > 4 ? "traffic" : "normal";
}

function routeColor(traffic?: string) {
  return traffic === "traffic" ? "oklch(0.58 0.22 28)" : "oklch(0.42 0.09 200)";
}

const createLegIcon = (L: LeafletModule, from: MapStop, to: MapStop, trafficOverride?: string) => {
  const fallbackEstimate = legEstimate(from, to);
  const estimate = { ...fallbackEstimate, traffic: trafficOverride ?? fallbackEstimate.traffic };
  const hasTraffic = estimate.traffic === "traffic";
  return L.divIcon({
    className: "masari-leg-label",
    html: `<div style="
      display: inline-flex; align-items: center; gap: 5px;
      white-space: nowrap; padding: 5px 8px;
      border-radius: 999px; background: white;
      border: 1px solid ${hasTraffic ? "oklch(0.72 0.18 28)" : "oklch(0.82 0.03 80)"};
      box-shadow: 0 4px 12px oklch(0.18 0.025 200 / 0.18);
      color: ${hasTraffic ? "oklch(0.44 0.18 28)" : "oklch(0.22 0.04 200)"};
      font: 700 11px Inter, sans-serif;
    ">
      ${from.n}→${to.n} · ${estimate.minutes}m · ${estimate.distanceKm}km · ${estimate.traffic}
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function routeUrl(stops: MapStop[]) {
  const coordinates = stops.map((stop) => `${stop.lng},${stop.lat}`).join(";");
  return `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
}

interface PlannerMapProps {
  center: [number, number];
  zoom?: number;
  markerLabel?: string;
  stops?: MapStop[];
}

export function PlannerMap({ center, zoom = 12, markerLabel, stops = [] }: PlannerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const mainMarkerRef = useRef<Leaflet.Marker | null>(null);
  const stopLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function createMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      mainMarkerRef.current = L.marker(center, { icon: createDefaultIcon(L) }).addTo(map);
      if (markerLabel) mainMarkerRef.current.bindPopup(markerLabel);
      routeLayerRef.current = L.layerGroup().addTo(map);
      stopLayerRef.current = L.layerGroup().addTo(map);
    }

    createMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(center, zoom, { duration: 0.8 });
    if (mainMarkerRef.current) {
      mainMarkerRef.current.setLatLng(center);
      if (markerLabel) mainMarkerRef.current.bindPopup(markerLabel);
    }
  }, [center, zoom, markerLabel]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = stopLayerRef.current;
    const routeLayer = routeLayerRef.current;
    const map = mapRef.current;
    if (!L || !layer || !routeLayer || !map) return;

    layer.clearLayers();
    routeLayer.clearLayers();
    const bounds = L.latLngBounds([center]);

    if (stops.length === 0) {
      map.flyTo(center, zoom, { duration: 0.8 });
      return;
    }

    for (const s of stops) {
      const m = L.marker([s.lat, s.lng], { icon: createStopIcon(L, s.n) });
      m.bindPopup(`<strong>${s.n}.</strong> ${s.title}`);
      m.addTo(layer);
      bounds.extend([s.lat, s.lng]);
    }

    if (stops.length > 1) {
      stops.slice(0, -1).forEach((stop, index) => {
        const next = stops[index + 1];
        const estimate = legEstimate(stop, next);
        L.polyline([[stop.lat, stop.lng], [next.lat, next.lng]], {
          color: routeColor(estimate.traffic),
          weight: 4,
          opacity: 0.75,
          dashArray: "6 8",
        }).addTo(routeLayer);
        const midpoint: [number, number] = [(stop.lat + next.lat) / 2, (stop.lng + next.lng) / 2];
        const label = L.marker(midpoint, { icon: createLegIcon(L, stop, next), interactive: false });
        label.addTo(routeLayer);
      });
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    }
  }, [stops, center, zoom]);

  useEffect(() => {
    const L = leafletRef.current;
    const routeLayer = routeLayerRef.current;
    if (!L || !routeLayer || stops.length < 2 || stops.length > 25) return;

    let cancelled = false;

    async function drawRoadRoute() {
      try {
        const legs = await Promise.all(
          stops.slice(0, -1).map(async (stop, index) => {
            const next = stops[index + 1];
            const res = await fetch(routeUrl([stop, next]));
            if (!res.ok) return null;
            const data = (await res.json()) as {
              routes?: {
                distance?: number;
                duration?: number;
                geometry?: { coordinates?: [number, number][] };
              }[];
            };
            const route = data.routes?.[0];
            const coordinates = route?.geometry?.coordinates;
            if (!coordinates?.length) return null;
            return {
              from: stop,
              to: next,
              traffic: routeTraffic(route.distance, route.duration),
              latLngs: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
            };
          })
        );

        if (cancelled) return;
        const validLegs = legs.filter((leg): leg is NonNullable<typeof leg> => Boolean(leg));
        if (validLegs.length === 0) return;

        routeLayer.clearLayers();
        for (const leg of validLegs) {
          L.polyline(leg.latLngs, {
            color: routeColor(leg.traffic),
            weight: 7,
            opacity: 0.24,
          }).addTo(routeLayer);
          L.polyline(leg.latLngs, {
            color: routeColor(leg.traffic),
            weight: 3,
            opacity: 0.95,
          }).addTo(routeLayer);
        }
        validLegs.forEach(({ from, to, traffic }) => {
          const midpoint: [number, number] = [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2];
          L.marker(midpoint, { icon: createLegIcon(L, from, to, traffic), interactive: false }).addTo(routeLayer);
        });
      } catch {
        // Keep the direct fallback route already drawn.
      }
    }

    drawRoadRoute();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl overflow-hidden"
      style={{ minHeight: 320 }}
    />
  );
}
