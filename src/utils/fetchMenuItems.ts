import { supabase } from "@/lib/supabaseClient";

export async function fetchMenuItems(businessId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("business_id", businessId)
    .eq("availability", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching menu:", error.message);
    return [];
  }

  return data || [];
}