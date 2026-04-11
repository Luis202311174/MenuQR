import { supabase } from "@/lib/supabaseClient";

export type Business = {
  id: string;
  name: string;
  address: string;
  store_hours: string;
  logo_url?: string;
  slug: string;
  store_category: string;
  other_ctgry?: string;
  contact_info?: string;
};

export async function fetchStores(): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,address,store_hours,logo_url,slug,store_category,other_ctgry,contact_info")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching stores:", error.message);
    return [];
  }

  return data || [];
}