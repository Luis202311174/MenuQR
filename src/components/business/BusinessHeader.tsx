"use client";

import { useEffect, useState } from "react";
import BusinessMiniMap from "./BusinessMiniMap";
import BusinessQR from "./BusinessQR";
import { supabase } from "@/lib/supabaseClient";

type Business = {
  id?: string;
  slug?: string;
  name: string;
  address?: string;
  contact_info?: string;
  email?: string;
  logo_url?: string;
  store_hours?: string;
  store_category?: string;
  fb?: string;
  ig?: string;
  fp?: string;
  gr?: string;
  business_socials?: Array<{
    fb?: string;
    ig?: string;
    fp?: string;
    gr?: string;
  }>;
  latitude?: number;
  longitude?: number;
  view_count?: number;
};

export default function BusinessHeader({ business }: { business: Business }) {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!business.id) return;

    const fetchRatings = async () => {
      const { data, error } = await supabase
        .from("order_ratings")
        .select("rating")
        .eq("business_id", business.id);

      if (error) {
        console.error("Error fetching ratings:", error);
        return;
      }

      if (data && data.length > 0) {
        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        setAverageRating(sum / data.length);
        setTotalRatings(data.length);
      } else {
        setAverageRating(null);
        setTotalRatings(0);
      }
    };

    fetchRatings();
  }, [business.id]);

  const relatedSocials = Array.isArray(business.business_socials)
    ? business.business_socials[0]
    : business.business_socials;

  const fb = business.fb || relatedSocials?.fb;
  const ig = business.ig || relatedSocials?.ig;
  const fp = business.fp || relatedSocials?.fp;
  const gr = business.gr || relatedSocials?.gr;

  return (
    <section className="bg-white border border-gray-200 rounded-[28px] shadow-sm p-4 sm:p-5">
      <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">

        {/* LEFT SIDE */}
        <div className="flex-1 flex gap-3 sm:gap-4">

          {/* FLIP CARD */}
          <div
            className="flex-shrink-0 cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={() => setIsFlipped((prev) => !prev)}
          >
            <div
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT (LOGO) */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    No Logo
                  </div>
                )}
              </div>

              {/* BACK (QR) */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center p-2"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {business.slug ? (
                  <div className="flex flex-col items-center gap-1">
                    <BusinessQR slug={business.slug} />
                    <span className="text-[9px] text-gray-500 font-medium">
                      Scan me
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    No QR
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TEXT CONTENT */}
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold mb-1 leading-tight">
              {business.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 mb-2">
              {typeof business.view_count === "number" && (
                <p className="flex items-center gap-1">
                  👁 {business.view_count.toLocaleString()} views
                </p>
              )}

              {totalRatings > 0 && averageRating !== null && (
                <p className="flex items-center gap-1">
                  ⭐ {averageRating.toFixed(1)} ({totalRatings} rating
                  {totalRatings !== 1 ? "s" : ""})
                </p>
              )}
            </div>

            {business.address && (
              <p className="text-gray-700 mb-1 text-xs sm:text-sm">
                {business.address}
              </p>
            )}

            {business.contact_info && (
              <p className="text-gray-700 mb-1 text-xs sm:text-sm">
                {business.contact_info}
              </p>
            )}

            {business.email && (
              <p className="text-gray-700 mb-1 text-xs sm:text-sm">
                {business.email}
              </p>
            )}

            {(business.store_hours || business.store_category) && (
              <p className="text-gray-600 text-xs sm:text-sm">
                {business.store_hours || ""}
                {business.store_hours && business.store_category ? " • " : ""}
                {business.store_category || ""}
              </p>
            )}

            {(fb || ig || fp || gr) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold"
                  >
                    Facebook
                  </a>
                )}
                {ig && (
                  <a
                    href={ig}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-pink-500 text-white rounded-full text-xs font-semibold"
                  >
                    Instagram
                  </a>
                )}
                {fp && (
                  <a
                    href={fp}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-semibold"
                  >
                    Foodpanda
                  </a>
                )}
                {gr && (
                  <a
                    href={gr}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold"
                  >
                    Grab
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE MAP */}
        <div className="hidden md:block w-full md:w-[220px] h-40 sm:h-44 flex-shrink-0">
          <div className="w-full h-full rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
            <BusinessMiniMap
              lat={business.latitude}
              lng={business.longitude}
            />
          </div>
        </div>

      </div>
    </section>
  );
}
