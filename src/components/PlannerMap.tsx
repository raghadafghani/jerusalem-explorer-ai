import { useEffect, useRef } from "react";
import L from "leaflet";

// Fix default marker icons in Vite bundling
const DefaultIcon = L.divIcon({
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

const StopIcon = (n: number) => L.divIcon({
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

interface PlannerMapProps {
  center: [number, number];
  zoom?: number;
  markerLabel?: string;
  stops?: MapStop[];
}

export function PlannerMap({ center, zoom = 12, markerLabel, stops = [] }: PlannerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mainMarkerRef = useRef<L.Marker | null>(null);
  const stopLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    mainMarkerRef.current = L.marker(center, { icon: DefaultIcon }).addTo(map);
    if (markerLabel) mainMarkerRef.current.bindPopup(markerLabel);
    stopLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
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
    const layer = stopLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (stops.length === 0) return;
    const bounds = L.latLngBounds([center]);
    for (const s of stops) {
      const m = L.marker([s.lat, s.lng], { icon: StopIcon(s.n) });
      m.bindPopup(`<strong>${s.n}.</strong> ${s.title}`);
      m.addTo(layer);
      bounds.extend([s.lat, s.lng]);
    }
    if (stops.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [stops, center]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl overflow-hidden"
      style={{ minHeight: 320 }}
    />
  );
}
