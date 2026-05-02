"use client";

import Image from "next/image";
import Link from "next/link";

type StoreTileProps = {
  name: string;
  address: string;
  store_hours: string;
  logo_url?: string;
  slug: string;
};

export default function StoreTile({
  name,
  address,
  store_hours,
  logo_url,
  slug,
}: StoreTileProps) {
  return (
    <Link
      href={`/${slug}`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition"
    >
      {/* LOGO */}
      <div className="w-16 h-16 relative flex-shrink-0">
        <Image
          src={logo_url || "/placeholder-store.png"}
          alt={name}
          fill
          className="object-cover rounded-lg"
        />
      </div>

      {/* INFO */}
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-[#111]">{name}</h3>
        <p className="text-sm text-gray-600">{address}</p>
        <p className="text-xs text-gray-500">{store_hours}</p>
      </div>
    </Link>
  );
}