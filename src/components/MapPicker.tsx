"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { LatLng, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickMarker({ setTemp }: { setTemp: (pos: LatLng) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      setTemp(e.latlng);
    },
  });

  return null;
}

type Props = {
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number }) => void;
};

export default function MapPicker({
  coordinates,
  setCoordinates,
}: Props) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<LatLng | null>(null);

  const handleConfirm = () => {
    if (!temp) return;

    setCoordinates({
      lat: temp.lat,
      lng: temp.lng,
    });

    setOpen(false);
  };

  return (
    <>
      {/* PREVIEW */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden cursor-pointer"
        onClick={() => {
          setOpen(true);

          if (coordinates) {
            setTemp(L.latLng(coordinates.lat, coordinates.lng));
          }
        }}
      >
        <MapContainer
          center={
            coordinates
              ? [coordinates.lat, coordinates.lng]
              : [14.8386, 120.2842]
          }
          zoom={coordinates ? 16 : 13}
          style={{ height: "120px", width: "100%" }}
          dragging={false}
          scrollWheelZoom={false}
          zoomControl={false}
          className="pointer-events-none"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {coordinates && (
            <Marker
              position={[coordinates.lat, coordinates.lng]}
              icon={pinIcon}
            />
          )}
        </MapContainer>

        {/* ✅ REMOVED ADDRESS DISPLAY COMPLETELY */}
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl w-full max-w-2xl p-4 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-xl"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-3">
              Select Location
            </h2>

            <MapContainer
              center={
                temp
                  ? temp
                  : coordinates
                  ? [coordinates.lat, coordinates.lng]
                  : [14.8386, 120.2842]
              }
              zoom={13}
              style={{ height: "400px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <ClickMarker setTemp={setTemp} />

              {temp && <Marker position={temp} icon={pinIcon} />}
            </MapContainer>

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                disabled={!temp}
                className="bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}