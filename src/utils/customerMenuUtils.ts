import { supabase } from "@/lib/supabaseClient";

export type CustomerOptionGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  menu_item_options: CustomerOption[];
};

export type CustomerOption = {
  id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
};

export async function fetchMenuItemWithOptions(itemId: string) {
  const { data, error } = await supabase
    .from("menu_item_option_groups")
    .select(
      `
      id,
      name,
      is_required,
      min_select,
      max_select,
      menu_item_options (
        id,
        name,
        price_modifier,
        is_available
      )
    `
    )
    .eq("menu_item_id", itemId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}