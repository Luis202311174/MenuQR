"use client";

import BusinessQR from "./BusinessQR";
import { useRef } from "react";

type Business = {
  name: string;
  address: string;
  store_hours: string;
  logo_url?: string;
  store_category: string;
  slug: string;
};

export default function BusinessHeader({ business }: { business: Business }) {
  // Ref to the QR code container
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 1024; // high resolution QR
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, size, size);

      const pngUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${business.name}-qr.png`;
      link.click();

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className="w-full bg-white shadow-sm border-b">
      <div className="max-w-[1200px] mx-auto px-4 py-6 flex gap-6 items-center">

        <div ref={qrRef}>
          <BusinessQR slug={business.slug} />
        </div>

        <button
          onClick={downloadQR}
          className="text-sm text-blue-600"
        >
          Download QR
        </button>

        {/* Logo */}
        <div className="w-20 h-20 rounded overflow-hidden bg-gray-100">
          {business.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Business Info */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-gray-600">{business.address}</p>
          <p className="text-gray-500 text-sm">
            {business.store_hours} • {business.store_category}
          </p>
        </div>

      </div>
    </div>
  );
}