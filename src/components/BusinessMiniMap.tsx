"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const BusinessMiniMapInner = dynamic(
  () => import("./BusinessMiniMapInner"),
  { ssr: false }
);

type Props = {
  lat?: number;
  lng?: number;
};

export default function BusinessMiniMap({ lat, lng }: Props) {
  const [open, setOpen] = useState(false);

  if (!lat || !lng) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
        No location set
      </div>
    );
  }

  return (
    <>
      {/* PREVIEW (CLICKABLE) */}
      <div
        className="w-full h-full cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <BusinessMiniMapInner lat={lat} lng={lng} interactive={false} />
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl relative">

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-xl z-[10000]"
            >
              ✕
            </button>

            {/* TITLE */}
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">
                Business Location
              </h2>
            </div>

            {/* FULL MAP */}
            <div className="w-full h-[500px]">
              <BusinessMiniMapInner lat={lat} lng={lng} interactive={true}
                key="modal-map"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}