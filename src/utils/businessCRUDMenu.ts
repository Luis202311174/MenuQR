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
  const { error } = await supabase.from("menu_items").insert({
    business_id: payload.business_id,
    name: payload.name,
    category: payload.category,
    price: payload.price,
    availability: payload.availability ?? true,
    image_url: payload.image_url ?? null,
    menu_desc: payload.menu_desc ?? null,
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function updateMenuItem(itemId: string, payload: MenuItemUpdatePayload) {
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: payload.name,
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