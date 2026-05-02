// DEPRECATED: TrendingCarousel is no longer used in the app and can be removed.
// It remains here temporarily for reference but its imports have been deleted
// from every page. Feel free to delete this file once you're comfortable.

"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";

type MenuImage = {
  id: number;
  image_url: string;
};

export default function TrendingCarousel() {
  const [images, setImages] = useState<MenuImage[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // only fetch if there is a valid session (avoids RLS permission issue)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // anonymous user, nothing to load
          return;
        }

        const { data, error } = await supabase
          .from("menus")
          .select("id, image_url")
          .limit(8);

        if (error) {
          // supabase error objects can be sparse; stringify for debugging
          const errMsg = error.message || JSON.stringify(error) || "unknown error";
          console.error("TrendingCarousel failed to fetch menus:", errMsg);
          return;
        }

        if (!data || data.length === 0) {
          console.warn("TrendingCarousel: no rows returned from menus table");
          return;
        }

        setImages(data as MenuImage[]);
      } catch (e) {
        // network or runtime failure
        console.error("TrendingCarousel exception while loading", e);
      }
    };

    load();
  }, []);

  if (images.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-[#fafafa]">
        <p className="text-gray-500">No trending menus available</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-[400px] mx-auto relative"
      style={{ perspective: "1000px" }}
    >
      <div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
      >
        {images.map((img, idx) => {
          const angle = idx * 45; // eight items 360/8 = 45deg
          return (
            <div
              key={img.id}
              className="absolute top-0 left-1/2 w-64 h-64 -translate-x-1/2 transition-transform"
              style={{
                transform: `rotateY(${angle}deg) translateZ(300px)`,
              }}
            >
              <Image
                src={img.image_url}
                alt={`Trending menu ${idx + 1}`}
                width={256}
                height={256}
                className="object-cover rounded-xl"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
