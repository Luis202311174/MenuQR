import { NextRequest, NextResponse } from "next/server";
import { authorizeOptionGroupRequest } from "@/lib/optionGroupApi";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params;
  const access = await authorizeOptionGroupRequest(req, "create");
  if ("response" in access) return access.response;

  let payload: { name?: unknown; price_modifier?: unknown; is_available?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const priceModifier = Number(payload.price_modifier ?? 0);
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Choice name must be between 1 and 80 characters." }, { status: 400 });
  }
  if (!Number.isFinite(priceModifier)) {
    return NextResponse.json({ error: "Price modifier must be a valid number." }, { status: 400 });
  }

  const { data: lastChoice, error: orderError } = await access.supabase
    .from("option_choices")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

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
    .insert({
      group_id: groupId,
      name,
      price_modifier: priceModifier,
      is_available: payload.is_available !== false,
      sort_order: (lastChoice?.sort_order ?? -1) + 1,
    })
    .select("id,group_id,name,price_modifier,is_available,sort_order,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}