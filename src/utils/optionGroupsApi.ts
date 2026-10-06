import { supabase } from "@/lib/supabaseClient";

export type OptionChoice = {
  id: string;
  group_id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
};

export type GlobalOptionGroup = {
  id: string;
  business_id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
  is_reusable: boolean;
  created_at: string;
  updated_at: string;
  choices: OptionChoice[];
  menu_item_ids: string[];
};

export type OptionGroupMenuItem = {
  id: string;
  name: string;
  category: string | null;
  sort_order: number;
};

export type OptionGroupData = {
  groups: GlobalOptionGroup[];
  items: OptionGroupMenuItem[];
};

export type LinkedOptionGroup = Omit<GlobalOptionGroup, "choices" | "menu_item_ids"> & {
  menu_item_options: OptionChoice[];
};

async function request<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers({ "Content-Type": "application/json" });

  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) throw new Error(result?.error || "Unable to manage option groups.");
  return result as T;
}

export function fetchOptionGroupData() {
  return request<OptionGroupData>("/api/business/option-groups", "GET");
}

export async function fetchOptionGroupsForItem(menuItemId: string): Promise<LinkedOptionGroup[]> {
  const { data: links, error: linksError } = await supabase
    .from("item_option_groups")
    .select("option_group_id,position")
    .eq("menu_item_id", menuItemId)
    .order("position");

  if (linksError) throw linksError;
  const groupIds = (links ?? []).map((link) => link.option_group_id);
  if (groupIds.length === 0) return [];

  const { data: groups, error: groupsError } = await supabase
    .from("option_groups")
    .select("id,business_id,name,is_required,min_select,max_select,sort_order,is_active,is_reusable,created_at,updated_at,option_choices(id,group_id,name,price_modifier,is_available,sort_order,created_at)")
    .in("id", groupIds)
    .order("sort_order", { ascending: true });

  if (groupsError) throw groupsError;
  const byId = new Map((groups ?? []).map((group) => [group.id, group]));

  const linkedGroupIds = new Set(groupIds);
  return (groups ?? []).filter((group) => linkedGroupIds.has(group.id)).map((group) => {
    const { option_choices: choices, ...groupData } = group;
    return {
      ...groupData,
      menu_item_options: (choices ?? [])
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((choice) => ({
        ...choice,
        price_modifier: Number(choice.price_modifier),
      })),
    };
  });
}

export function createGlobalOptionGroup(
  payload: Pick<GlobalOptionGroup, "name" | "is_required" | "min_select" | "max_select">,
  menuItemIds: string[] = [],
  isReusable = true,
) {
  return request<GlobalOptionGroup>("/api/business/option-groups", "POST", {
    ...payload,
    menu_item_ids: menuItemIds,
    is_reusable: isReusable,
  });
}

export function updateGlobalOptionGroup(
  groupId: string,
  payload: Pick<GlobalOptionGroup, "name" | "is_required" | "min_select" | "max_select">,
) {
  return request<GlobalOptionGroup>(`/api/business/option-groups/${groupId}`, "PATCH", payload);
}

export function setOptionGroupItems(groupId: string, menuItemIds: string[]) {
  return request<{ success: true }>(`/api/business/option-groups/${groupId}`, "PATCH", {
    action: "assign-items",
    menu_item_ids: menuItemIds,
  });
}

export function deleteGlobalOptionGroup(groupId: string) {
  return request<{ success: true }>(`/api/business/option-groups/${groupId}`, "DELETE");
}

export function createOptionChoice(groupId: string, payload: Pick<OptionChoice, "name" | "price_modifier" | "is_available">) {
  return request<OptionChoice>(`/api/business/option-groups/${groupId}/choices`, "POST", payload);
}

export function updateOptionChoice(groupId: string, choiceId: string, payload: Pick<OptionChoice, "name" | "price_modifier" | "is_available">) {
  return request<OptionChoice>(`/api/business/option-groups/${groupId}/choices/${choiceId}`, "PATCH", payload);
}

export function deleteOptionChoice(groupId: string, choiceId: string) {
  return request<{ success: true }>(`/api/business/option-groups/${groupId}/choices/${choiceId}`, "DELETE");
}

export function detachOptionGroupFromItem(groupId: string, menuItemId: string) {
  return request<{ success: true }>(`/api/business/option-groups/${groupId}`, "PATCH", {
    action: "unlink-item",
    menu_item_id: menuItemId,
  });
}

export function linkOptionGroupToItem(groupId: string, menuItemId: string) {
  return request<{ success: true }>(`/api/business/option-groups/${groupId}`, "PATCH", {
    action: "link-item",
    menu_item_id: menuItemId,
  });
}

export function setOptionGroupArchived(groupId: string, archived: boolean) {
  return request<{ id: string; is_active: boolean }>(`/api/business/option-groups/${groupId}`, "PATCH", {
    action: archived ? "archive" : "restore",
  });
}