"use client";

import QRCode from "react-qr-code";

export default function BusinessQR({ slug }: { slug: string }) {

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}`
      : `/${slug}`;

  return (
    <div className="bg-white p-2 rounded shadow">
      <QRCode value={url} size={80} />
    </div>
  );
}