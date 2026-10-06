import { NextRequest, NextResponse } from "next/server";
import { authorizeOptionGroupRequest } from "@/lib/optionGroupApi";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params;
  let payload: {
    action?: unknown;
    name?: unknown;
    is_required?: unknown;
    min_select?: unknown;
    max_select?: unknown;
    menu_item_ids?: unknown;
    menu_item_id?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const permission = payload.action === "link-item" ? "create" : "edit";
  const access = await authorizeOptionGroupRequest(req, permission);
  if ("response" in access) return access.response;

  if (payload.action === "archive" || payload.action === "restore") {
    const { data, error } = await access.supabase
      .from("option_groups")
      .update({ is_active: payload.action === "restore", updated_at: new Date().toISOString() })
      .eq("id", groupId)
      .eq("business_id", access.businessId)
      .select("id,is_active")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Option group not found." }, { status: error ? 500 : 404 });
    }
    return NextResponse.json(data);
  }

  if (payload.action === "link-item" || payload.action === "unlink-item") {
    if (typeof payload.menu_item_id !== "string") {
      return NextResponse.json({ error: "A menu item ID is required." }, { status: 400 });
    }

    const { error } = await access.supabase.rpc(
      payload.action === "link-item" ? "link_option_group_item" : "unlink_option_group_item",
      {
        p_group_id: groupId,
        p_business_id: access.businessId,
        p_menu_item_id: payload.menu_item_id,
      },
    );

    if (error) {
      const status = error.code === "P0002" ? 404 : error.code === "22023" ? 400 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ success: true });
  }

  if (payload.action === "assign-items") {
    if (!Array.isArray(payload.menu_item_ids) || !payload.menu_item_ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "Menu item IDs must be an array of IDs." }, { status: 400 });
    }

    const { error } = await access.supabase.rpc("set_option_group_items", {
      p_group_id: groupId,
      p_business_id: access.businessId,
      p_menu_item_ids: payload.menu_item_ids,
    });

    if (error) {
      const status = error.code === "P0002" ? 404 : error.code === "22023" ? 400 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ success: true });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const required = payload.is_required === true;
  const minSelect = Number(payload.min_select);
  const maxSelect = Number(payload.max_select);
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Group name must be between 1 and 80 characters." }, { status: 400 });
  }
  if (!Number.isInteger(minSelect) || !Number.isInteger(maxSelect) || minSelect < 0 || maxSelect < 1 || minSelect > maxSelect) {
    return NextResponse.json({ error: "Selection limits must be whole numbers and minimum cannot exceed maximum." }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("option_groups")
    .update({
      name,
      is_required: required,
      min_select: minSelect,
      max_select: maxSelect,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .eq("business_id", access.businessId)
    .select("id,business_id,name,is_required,min_select,max_select,sort_order,is_active,is_reusable,created_at,updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Option group not found." }, { status: error ? 500 : 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params;
  const access = await authorizeOptionGroupRequest(req, "delete");
  if ("response" in access) return access.response;

  const { data, error } = await access.supabase
    .from("option_groups")
    .delete()
    .eq("id", groupId)
    .eq("business_id", access.businessId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Option group not found." }, { status: error ? 500 : 404 });
  }
  return NextResponse.json({ success: true });
}