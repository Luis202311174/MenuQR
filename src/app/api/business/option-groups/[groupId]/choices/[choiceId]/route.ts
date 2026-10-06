import { NextRequest, NextResponse } from "next/server";
import { authorizeOptionGroupRequest } from "@/lib/optionGroupApi";

type RouteContext = { params: Promise<{ groupId: string; choiceId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { groupId, choiceId } = await context.params;
  const access = await authorizeOptionGroupRequest(req, "edit");
  if ("response" in access) return access.response;

  let payload: { name?: unknown; price_modifier?: unknown; is_available?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const priceModifier = Number(payload.price_modifier);
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Choice name must be between 1 and 80 characters." }, { status: 400 });
  }
  if (!Number.isFinite(priceModifier) || typeof payload.is_available !== "boolean") {
    return NextResponse.json({ error: "Choice price and availability are invalid." }, { status: 400 });
  }

  const { data: group, error: groupError } = await access.supabase
    .from("option_groups")
    .select("id")
    .eq("id", groupId)
    .eq("business_id", access.businessId)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message || "Option group not found." }, { status: groupError ? 500 : 404 });
  }

  const { data, error } = await access.supabase
    .from("option_choices")
    .update({
      name,
      price_modifier: priceModifier,
      is_available: payload.is_available,
      updated_at: new Date().toISOString(),
    })
    .eq("id", choiceId)
    .eq("group_id", groupId)
    .select("id,group_id,name,price_modifier,is_available,sort_order,created_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Choice not found." }, { status: error ? 500 : 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { groupId, choiceId } = await context.params;
  const access = await authorizeOptionGroupRequest(req, "delete");
  if ("response" in access) return access.response;

  const { data: group, error: groupError } = await access.supabase
    .from("option_groups")
    .select("id")
    .eq("id", groupId)
    .eq("business_id", access.businessId)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message || "Option group not found." }, { status: groupError ? 500 : 404 });
  }

  const { data, error } = await access.supabase
    .from("option_choices")
    .delete()
    .eq("id", choiceId)
    .eq("group_id", groupId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Choice not found." }, { status: error ? 500 : 404 });
  }
  return NextResponse.json({ success: true });
}