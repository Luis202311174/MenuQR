import { NextRequest, NextResponse } from "next/server";
import { authorizeOptionGroupRequest } from "@/lib/optionGroupApi";

export async function GET(req: NextRequest) {
  const access = await authorizeOptionGroupRequest(req, "view");
  if ("response" in access) return access.response;

  const [{ data: groups, error: groupsError }, { data: items, error: itemsError }] = await Promise.all([
    access.supabase
      .from("option_groups")
      .select("id,business_id,name,is_required,min_select,max_select,sort_order,is_active,is_reusable,created_at,updated_at")
      .eq("business_id", access.businessId)
      .eq("is_reusable", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    access.supabase
      .from("menu_items")
      .select("id,name,category,sort_order")
      .eq("business_id", access.businessId)
      .order("sort_order", { ascending: true })
      .order("name"),
  ]);

  if (groupsError || itemsError) {
    return NextResponse.json({ error: groupsError?.message || itemsError?.message }, { status: 500 });
  }

  const groupIds = (groups ?? []).map((group) => group.id);
  if (groupIds.length === 0) {
    return NextResponse.json({ groups: [], items: items ?? [] });
  }

  const [{ data: choices, error: choicesError }, { data: links, error: linksError }] = await Promise.all([
    access.supabase
      .from("option_choices")
      .select("id,group_id,name,price_modifier,is_available,sort_order,created_at")
      .in("group_id", groupIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    access.supabase
      .from("item_option_groups")
      .select("menu_item_id,option_group_id,position")
      .in("option_group_id", groupIds)
      .order("position"),
  ]);

  if (choicesError || linksError) {
    return NextResponse.json({ error: choicesError?.message || linksError?.message }, { status: 500 });
  }

  const choicesByGroup = new Map<string, typeof choices>();
  for (const choice of choices ?? []) {
    const current = choicesByGroup.get(choice.group_id) ?? [];
    current.push(choice);
    choicesByGroup.set(choice.group_id, current);
  }

  const itemIdsByGroup = new Map<string, string[]>();
  for (const link of links ?? []) {
    const current = itemIdsByGroup.get(link.option_group_id) ?? [];
    current.push(link.menu_item_id);
    itemIdsByGroup.set(link.option_group_id, current);
  }

  return NextResponse.json({
    groups: (groups ?? []).map((group) => ({
      ...group,
      choices: choicesByGroup.get(group.id) ?? [],
      menu_item_ids: itemIdsByGroup.get(group.id) ?? [],
    })),
    items: items ?? [],
  });
}

export async function POST(req: NextRequest) {
  const access = await authorizeOptionGroupRequest(req, "create");
  if ("response" in access) return access.response;

  let payload: {
    name?: unknown;
    is_required?: unknown;
    min_select?: unknown;
    max_select?: unknown;
    menu_item_ids?: unknown;
    is_reusable?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const required = payload.is_required === true;
  const minSelect = Number(payload.min_select ?? (required ? 1 : 0));
  const maxSelect = Number(payload.max_select ?? 1);
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Group name must be between 1 and 80 characters." }, { status: 400 });
  }
  if (!Number.isInteger(minSelect) || !Number.isInteger(maxSelect) || minSelect < 0 || maxSelect < 1 || minSelect > maxSelect) {
    return NextResponse.json({ error: "Selection limits must be whole numbers and minimum cannot exceed maximum." }, { status: 400 });
  }
  if (payload.menu_item_ids !== undefined && (!Array.isArray(payload.menu_item_ids) || !payload.menu_item_ids.every((id) => typeof id === "string"))) {
    return NextResponse.json({ error: "Menu item IDs must be an array of IDs." }, { status: 400 });
  }
  if (payload.is_reusable !== undefined && typeof payload.is_reusable !== "boolean") {
    return NextResponse.json({ error: "Group reuse setting must be a boolean." }, { status: 400 });
  }
  if (payload.is_reusable === false && (!Array.isArray(payload.menu_item_ids) || payload.menu_item_ids.length !== 1)) {
    return NextResponse.json({ error: "Item-only groups must be linked to exactly one menu item." }, { status: 400 });
  }

  const { data: lastGroup, error: orderError } = await access.supabase
    .from("option_groups")
    .select("sort_order")
    .eq("business_id", access.businessId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const { data, error } = await access.supabase
    .from("option_groups")
    .insert({
      business_id: access.businessId,
      name,
      is_required: required,
      min_select: minSelect,
      max_select: maxSelect,
      sort_order: (lastGroup?.sort_order ?? -1) + 1,
      is_reusable: payload.is_reusable !== false,
    })
    .select("id,business_id,name,is_required,min_select,max_select,sort_order,is_active,is_reusable,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(payload.menu_item_ids)) {
    const { error: assignmentError } = await access.supabase.rpc("set_option_group_items", {
      p_group_id: data.id,
      p_business_id: access.businessId,
      p_menu_item_ids: payload.menu_item_ids,
    });

    if (assignmentError) {
      await access.supabase.from("option_groups").delete().eq("id", data.id).eq("business_id", access.businessId);
      const status = assignmentError.code === "22023" ? 400 : 500;
      return NextResponse.json({ error: assignmentError.message }, { status });
    }
  }

  return NextResponse.json({ ...data, choices: [], menu_item_ids: [] }, { status: 201 });
}