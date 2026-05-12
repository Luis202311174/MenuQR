import { supabase } from "@/lib/supabaseClient";

export async function fetchBusinessBySlug(slug: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*, business_socials(id, fb, fp, ig, gr)")
    .eq("slug", slug);

  if (error) {
    console.error("Error fetching business:", error.message);
    return null;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  if (Array.isArray(data) && data.length > 1) {
    console.warn(`Multiple businesses found for slug ${slug}. Using the first matching business.`, data);
    return data[0];
  }

  return Array.isArray(data) ? data[0] : data;
}