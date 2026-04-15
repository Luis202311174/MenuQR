"use client";

import BusinessMiniMap from "./BusinessMiniMap";

type Business = {
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
  // KEEP SOCIALS LOGIC UNTOUCHED
  const relatedSocials = Array.isArray(business.business_socials)
    ? business.business_socials[0]
    : business.business_socials;

  const fb = business.fb || relatedSocials?.fb;
  const ig = business.ig || relatedSocials?.ig;
  const fp = business.fp || relatedSocials?.fp;
  const gr = business.gr || relatedSocials?.gr;

  return (
    <section className="bg-white border border-gray-300 rounded-2xl shadow-lg p-6">
      
      <div className="flex flex-col md:flex-row gap-6 items-stretch">

        {/* LEFT CONTENT */}
        <div className="flex-1 flex gap-4">
          
          {/* LOGO */}
          <div className="w-40 h-40 rounded-xl overflow-hidden bg-gray-100 border border-gray-300 shadow-md flex-shrink-0">
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

          {/* INFO */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">
              {business.name}
            </h1>

            {typeof business.view_count === "number" && (
              <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                👁 {business.view_count.toLocaleString()} views
              </p>
            )}

            {business.address && (
              <p className="text-gray-700 mb-1">
                {business.address}
              </p>
            )}

            {business.contact_info && (
              <p className="text-gray-700 mb-1">
                {business.contact_info}
              </p>
            )}

            {business.email && (
              <p className="text-gray-700 mb-1">
                {business.email}
              </p>
            )}

            {(business.store_hours || business.store_category) && (
              <p className="text-gray-600 text-sm">
                {business.store_hours || ""}
                {business.store_hours && business.store_category ? " • " : ""}
                {business.store_category || ""}
              </p>
            )}

            {/* SOCIALS (UNCHANGED LOGIC) */}
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

        {/* RIGHT MAP (FIXED SQUARE) */}
        <div className="w-full md:w-43 h-43 flex-shrink-0">
          <div className="w-full h-full rounded-xl overflow-hidden border border-gray-300 shadow-md">
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