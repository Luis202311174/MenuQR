import { supabase } from "@/lib/supabaseClient";

export async function fetchBusinessBySlug(slug: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*, business_socials(id, fb, fp, ig, gr)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching business:", error.message);
    return null;
  }

  return data;
}