import { supabase } from "@/lib/supabaseClient";

export type MenuCategory = {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  item_count: number;
};

export type MenuCategoryAction = "rename" | "archive" | "restore";

async function requestMenuCategories<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: Record<string, string>,
  includeArchived = false,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers({ "Content-Type": "application/json" });

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const query = method === "GET" && includeArchived ? "?includeArchived=true" : "";
  const response = await fetch(`/api/business/menu-categories${query}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Unable to manage menu categories.");
  }

  return result as T;
}

export function fetchMenuCategories(includeArchived = false) {
  return requestMenuCategories<MenuCategory[]>("GET", undefined, includeArchived);
}

export function createMenuCategory(name: string) {
  return requestMenuCategories<MenuCategory>("POST", { name });
}

export function updateMenuCategory(
  categoryId: string,
  action: MenuCategoryAction,
  name?: string,
) {
  return requestMenuCategories<MenuCategory>("PATCH", {
    categoryId,
    action,
    ...(name ? { name } : {}),
  });
}

export function deleteMenuCategory(categoryId: string) {
  return requestMenuCategories<{ success: true }>("DELETE", { categoryId });
}