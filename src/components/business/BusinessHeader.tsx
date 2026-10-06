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
  const formatTo12Hour = (time: string) => {
    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr);

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${ampm}`;
  };

  const formatStoreHours = (hours?: string) => {
    if (!hours) return "";

    const parts = hours.split(" - ");
    if (parts.length !== 2) return hours;

    const [start, end] = parts;

    return `${formatTo12Hour(start)} - ${formatTo12Hour(end)}`;
  };

  useEffect(() => {
    if (!business.id) return;

    const fetchRatings = async () => {
      try {
        const { data, error } = await supabase
          .from("order_ratings")
          .select("rating")
          .eq("business_id", business.id);

        if (error) {
          // Likely offline/network issue — avoid noisy console errors in that case
          if (typeof window !== "undefined" && !navigator.onLine) {
            setAverageRating(null);
            setTotalRatings(0);
            return;
          }

          // Log only meaningful server errors when online
          if (typeof window !== "undefined" && navigator.onLine) {
            const msg = error?.message ?? error ?? "Unknown rating error";
            console.error("Error fetching ratings:", msg);
          }

          setAverageRating(null);
          setTotalRatings(0);
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
      } catch (e) {
        if (typeof window !== "undefined" && !navigator.onLine) {
          setAverageRating(null);
          setTotalRatings(0);
          return;
        }
        console.error("Unexpected error fetching ratings:", e);
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-white shadow-sm sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col items-start gap-3 sm:gap-4 md:flex-row md:gap-5">

        {/* LEFT SIDE */}
        <div className="flex flex-1 gap-2.5 sm:gap-4">

          {/* FLIP CARD */}
          <div
            className="flex-shrink-0 cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={() => setIsFlipped((prev) => !prev)}
          >
            <div
              className="relative h-20 w-20 rounded-2xl transition-transform duration-500 sm:h-32 sm:w-32 sm:rounded-3xl"
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
            <h1 className="mb-1 text-lg font-bold leading-tight sm:text-2xl">
              {business.name}
            </h1>

          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-white/90 sm:mb-2 sm:text-sm">
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
              <p className="mb-0.5 text-[11px] text-white/90 sm:mb-1 sm:text-sm">
                {business.address}
              </p>
            )}

            {business.contact_info && (
              <p className="mb-0.5 text-[11px] text-white/90 sm:mb-1 sm:text-sm">
                {business.contact_info}
              </p>
            )}

            {business.email && (
              <p className="mb-0.5 text-[11px] text-white/90 sm:mb-1 sm:text-sm">
                {business.email}
              </p>
            )}

            {(business.store_hours || business.store_category) && (
              <p className="text-[11px] text-white/90 sm:text-sm">
                {formatStoreHours(business.store_hours)}
                {business.store_hours && business.store_category ? " • " : ""}
                {business.store_category || ""}
              </p>
            )}

            {(fb || ig || fp || gr) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
                  >
                    Facebook
                  </a>
                )}
                {ig && (
                  <a
                    href={ig}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
                  >
                    Instagram
                  </a>
                )}
                {fp && (
                  <a
                    href={fp}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
                  >
                    Foodpanda
                  </a>
                )}
                {gr && (
                  <a
                    href={gr}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
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
