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
  const { data: links, error: linksError } = await supabase
    .from("item_option_groups")
    .select("option_group_id,position")
    .eq("menu_item_id", itemId)
    .order("position");

  if (linksError) throw linksError;
  const groupIds = (links ?? []).map((link) => link.option_group_id);
  if (groupIds.length === 0) return [];

  const { data: groups, error: groupsError } = await supabase
    .from("option_groups")
    .select(`
      id,
      name,
      is_required,
      min_select,
      max_select,
      sort_order,
      option_choices (
        id,
        name,
        price_modifier,
        is_available,
        sort_order
      )
    `)
    .in("id", groupIds)
    .order("sort_order", { ascending: true })
    .eq("is_active", true);

  if (groupsError) throw groupsError;
  const groupsById = new Map((groups ?? []).map((group) => [group.id, group]));

  return (groups ?? []).flatMap((groupIdRow) => {
    const group = groupsById.get(groupIdRow.id);
    if (!group) return [];
    return [{
      id: group.id,
      name: group.name,
      is_required: group.is_required,
      min_select: group.min_select,
      max_select: group.max_select,
      menu_item_options: [...(group.option_choices ?? [])]
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((choice) => ({
        ...choice,
        price_modifier: Number(choice.price_modifier),
      })),
    }];
  });
}