"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  lat?: number;
  lng?: number;
  interactive?: boolean;
};

export default function BusinessMiniMapInner({ lat, lng, interactive = false }: Props) {
  if (!lat || !lng) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
        No location set
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      dragging={interactive}
      scrollWheelZoom={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  );
}