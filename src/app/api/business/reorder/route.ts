import { NextRequest, NextResponse } from "next/server";
import { authorizeOptionGroupRequest } from "@/lib/optionGroupApi";

type SortKind = "categories" | "menu-items" | "option-groups" | "option-choices";

export async function PATCH(req: NextRequest) {
  const access = await authorizeOptionGroupRequest(req, "edit");
  if ("response" in access) return access.response;

  let payload: { kind?: unknown; ids?: unknown; parentId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = payload.kind as SortKind;
  const ids = payload.ids;
  if (!(["categories", "menu-items", "option-groups", "option-choices"] as unknown[]).includes(kind)) {
    return NextResponse.json({ error: "Invalid reorder type." }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "IDs must be a non-empty array of unique strings." }, { status: 400 });
  }

  const supabase = access.supabase;
  const businessId = access.businessId;

  if (kind === "categories") {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("business_id", businessId)
      .in("id", ids);
    if (error || data?.length !== ids.length) {
      return NextResponse.json({ error: error?.message || "One or more categories do not belong to this business." }, { status: error ? 500 : 403 });
    }

    const results = await Promise.all(ids.map((id, sort_order) =>
      supabase.from("menu_categories").update({ sort_order }).eq("business_id", businessId).eq("id", id)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  if (kind === "menu-items") {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,category")
      .eq("business_id", businessId)
      .in("id", ids);
    if (error || data?.length !== ids.length) {
      return NextResponse.json({ error: error?.message || "One or more menu items do not belong to this business." }, { status: error ? 500 : 403 });
    }
    if (new Set((data ?? []).map((item) => item.category ?? "")).size !== 1) {
      return NextResponse.json({ error: "Menu items must be reordered within the same category." }, { status: 400 });
    }

    const results = await Promise.all(ids.map((id, sort_order) =>
      supabase.from("menu_items").update({ sort_order }).eq("business_id", businessId).eq("id", id)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  if (kind === "option-groups") {
    const { data, error } = await supabase
      .from("option_groups")
      .select("id")
      .eq("business_id", businessId)
      .eq("is_reusable", true)
      .in("id", ids);
    if (error || data?.length !== ids.length) {
      return NextResponse.json({ error: error?.message || "One or more groups do not belong to this business." }, { status: error ? 500 : 403 });
    }

    const results = await Promise.all(ids.map((id, sort_order) =>
      supabase.from("option_groups").update({ sort_order }).eq("business_id", businessId).eq("id", id)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  if (kind === "option-choices") {
    const parentId = typeof payload.parentId === "string" ? payload.parentId : "";
    if (!parentId) return NextResponse.json({ error: "Option group ID is required." }, { status: 400 });

    const { data: group, error: groupError } = await supabase
      .from("option_groups")
      .select("id")
      .eq("business_id", businessId)
      .eq("id", parentId)
      .maybeSingle();
    if (groupError || !group) {
      return NextResponse.json({ error: groupError?.message || "Option group not found." }, { status: groupError ? 500 : 404 });
    }

    const { data, error } = await supabase
      .from("option_choices")
      .select("id")
      .eq("group_id", parentId)
      .in("id", ids);
    if (error || data?.length !== ids.length) {
      return NextResponse.json({ error: error?.message || "One or more choices do not belong to this group." }, { status: error ? 500 : 403 });
    }

    const results = await Promise.all(ids.map((id, sort_order) =>
      supabase.from("option_choices").update({ sort_order }).eq("group_id", parentId).eq("id", id)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}