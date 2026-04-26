import { supabase } from "@/lib/supabaseClient";

export type MenuItemPayload = {
  business_id: string;
  name: string;
  category: string;
  price: number;
  availability?: boolean;
  image_url?: string | null;
  menu_desc?: string | null;
};

export type MenuItemUpdatePayload = {
  name: string;
  price: number;
  category: string;
  availability: boolean;
  image_url?: string | null;
  menu_desc?: string | null;
};

export async function fetchMenuItems(businessId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function uploadMenuImage(file: File) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("menu-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function createMenuItem(payload: MenuItemPayload) {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      business_id: payload.business_id,
      name: payload.name,
      category: payload.category,
      price: payload.price,
      availability: payload.availability ?? true,
      image_url: payload.image_url ?? null,
      menu_desc: payload.menu_desc ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMenuItem(itemId: string, payload: MenuItemUpdatePayload) {
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: payload.name,
      category: payload.category,
      price: payload.price,
      availability: payload.availability,
      image_url: payload.image_url ?? null,
      menu_desc: payload.menu_desc ?? null,
    })
    .eq("id", itemId);

  if (error) {
    throw error;
  }

  return true;
}

// ===== OPTION GROUP OPERATIONS =====

export async function createOptionGroup(
  menuItemId: string,
  name: string,
  isRequired: boolean = false,
  minSelect: number = 0,
  maxSelect: number = 1
) {
  const { data, error } = await supabase
    .from("menu_item_option_groups")
    .insert({
      menu_item_id: menuItemId,
      name,
      is_required: isRequired,
      min_select: minSelect,
      max_select: maxSelect,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOptionGroup(
  groupId: string,
  name: string,
  isRequired: boolean,
  minSelect: number,
  maxSelect: number
) {
  const { error } = await supabase
    .from("menu_item_option_groups")
    .update({
      name,
      is_required: isRequired,
      min_select: minSelect,
      max_select: maxSelect,
    })
    .eq("id", groupId);

  if (error) throw error;
  return true;
}

export async function deleteOptionGroup(groupId: string) {
  const { error } = await supabase
    .from("menu_item_option_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
  return true;
}

export async function fetchOptionGroups(menuItemId: string) {
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
    .eq("menu_item_id", menuItemId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ===== OPTION OPERATIONS =====

export async function createOption(
  groupId: string,
  name: string,
  priceModifier: number = 0,
  isAvailable: boolean = true
) {
  const { data, error } = await supabase
    .from("menu_item_options")
    .insert({
      group_id: groupId,
      name,
      price_modifier: priceModifier,
      is_available: isAvailable,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOption(
  optionId: string,
  name: string,
  priceModifier: number,
  isAvailable: boolean
) {
  const { error } = await supabase
    .from("menu_item_options")
    .update({
      name,
      price_modifier: priceModifier,
      is_available: isAvailable,
    })
    .eq("id", optionId);

  if (error) throw error;
  return true;
}

export async function deleteOption(optionId: string) {
  const { error } = await supabase
    .from("menu_item_options")
    .delete()
    .eq("id", optionId);

  if (error) throw error;
  return true;
}

export async function deleteMenuItem(itemId: string) {
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }

  return true;
}

export async function getBusinessByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
