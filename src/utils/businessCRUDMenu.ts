import { supabase } from "@/lib/supabaseClient";

export type MenuItemPayload = {
  business_id: string;
  name: string;
  category: string;
  price: number;
  availability?: boolean;
  image_url?: string | null;
  menu_desc?: string | null;
  daily_limit?: number;
  current_stock?: number;
  is_trackable?: boolean;
};

export type MenuItemUpdatePayload = {
  name: string;
  price: number;
  category: string;
  availability: boolean;
  image_url?: string | null;
  menu_desc?: string | null;
  daily_limit?: number;
  current_stock?: number;
  is_trackable?: boolean;
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
  const createdAt = new Date().toISOString();
  const currentStock = payload.current_stock ?? payload.daily_limit ?? 0;
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
      daily_limit: payload.daily_limit ?? 0,
      current_stock: currentStock,
      is_trackable: payload.is_trackable ?? false,
      last_inventory_reset: payload.is_trackable ? createdAt : null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMenuItem(itemId: string, payload: MenuItemUpdatePayload) {
  const payloadToUpdate: Record<string, any> = {
    name: payload.name,
    category: payload.category,
    price: payload.price,
    availability: payload.availability,
    image_url: payload.image_url ?? null,
    menu_desc: payload.menu_desc ?? null,
  };

  if (typeof payload.daily_limit === "number") {
    payloadToUpdate.daily_limit = payload.daily_limit;
  }

  if (typeof payload.current_stock === "number") {
    payloadToUpdate.current_stock = payload.current_stock;
  }

  if (typeof payload.is_trackable === "boolean") {
    payloadToUpdate.is_trackable = payload.is_trackable;
  }

  const { error } = await supabase
    .from("menu_items")
    .update(payloadToUpdate)
    .eq("id", itemId);

  if (error) {
    throw error;
  }

  return true;
}

export async function resetInventoryForBusiness(businessId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,daily_limit")
    .eq("business_id", businessId)
    .eq("is_trackable", true);

  if (error) {
    throw error;
  }

  const now = new Date().toISOString();

  await Promise.all(
    (data || []).map((item: any) =>
      supabase
        .from("menu_items")
        .update({
          current_stock: item.daily_limit ?? 0,
          last_inventory_reset: now,
        })
        .eq("id", item.id)
    )
  );
}

export async function lazyResetInventoryForBusiness(businessId: string) {
  const now = new Date();
  if (now.getHours() < 4) return false;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, error } = await supabase
    .from("menu_items")
    .select("id,daily_limit,last_inventory_reset,is_trackable")
    .eq("business_id", businessId)
    .eq("is_trackable", true);

  if (error) {
    throw error;
  }

  const itemsToReset = (data || []).filter((item: any) => {
    if (!item.last_inventory_reset) return true;
    const resetDate = new Date(item.last_inventory_reset);
    return resetDate < todayStart;
  });

  if (!itemsToReset.length) {
    return false;
  }

  const resetAt = now.toISOString();

  await Promise.all(
    itemsToReset.map((item: any) =>
      supabase
        .from("menu_items")
        .update({
          current_stock: item.daily_limit ?? 0,
          last_inventory_reset: resetAt,
        })
        .eq("id", item.id)
    )
  );

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
