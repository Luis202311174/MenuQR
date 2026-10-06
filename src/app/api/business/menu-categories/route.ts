import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
} from "@/lib/serverSupabase";

type MenuAction = "view" | "create" | "edit" | "delete";

async function authorizeMenuRequest(req: NextRequest, action: MenuAction) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = owner ? null : await getStaffSessionFromRequest(req);

  if (!owner && !staffSession) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  if (staffSession) {
    const permission = staffSession.permissions.find((item) => item.module_name === "menu");
    const allowed = action === "view"
      ? Boolean(permission?.can_view || permission?.can_create || permission?.can_edit || permission?.can_delete)
      : Boolean(permission?.[`can_${action}` as "can_create" | "can_edit" | "can_delete"]);

    if (!allowed) {
      return { response: NextResponse.json({ error: "You do not have permission to manage menu categories." }, { status: 403 }) };
    }
  }

  const supabase = createServerSupabaseAdminClient();
  let businessId = staffSession?.businessId ?? null;

  if (owner) {
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", owner.id)
      .maybeSingle();

    if (error || !business) {
      return { response: NextResponse.json({ error: "Business not found." }, { status: 404 }) };
    }

    businessId = business.id;
  }

  if (!businessId) {
    return { response: NextResponse.json({ error: "Business not found." }, { status: 404 }) };
  }

  return { supabase, businessId };
}

function readCategoryName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: NextRequest) {
  const access = await authorizeMenuRequest(req, "view");
  if ("response" in access) return access.response;

  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";
  let categoriesQuery = access.supabase
    .from("menu_categories")
    .select("id,business_id,name,is_active,sort_order,created_at,updated_at")
    .eq("business_id", access.businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeArchived) {
    categoriesQuery = categoriesQuery.eq("is_active", true);
  }

  const [{ data: categories, error }, { data: items, error: itemError }] = await Promise.all([
    categoriesQuery,
    access.supabase
      .from("menu_items")
      .select("category")
      .eq("business_id", access.businessId),
  ]);

  if (error || itemError) {
    return NextResponse.json({ error: error?.message || itemError?.message || "Failed to load categories." }, { status: 500 });
  }

  const itemCounts = new Map<string, number>();
  for (const item of items ?? []) {
    const key = item.category?.trim().toLocaleLowerCase();
    if (key) itemCounts.set(key, (itemCounts.get(key) ?? 0) + 1);
  }

  return NextResponse.json((categories ?? []).map((category) => ({
    ...category,
    item_count: itemCounts.get(category.name.trim().toLocaleLowerCase()) ?? 0,
  })));
}

export async function POST(req: NextRequest) {
  const access = await authorizeMenuRequest(req, "create");
  if ("response" in access) return access.response;

  let payload: { name?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = readCategoryName(payload.name);
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Category name must be between 1 and 60 characters." }, { status: 400 });
  }

  const { data: lastCategory, error: orderError } = await access.supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("business_id", access.businessId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const { data, error } = await access.supabase
    .from("menu_categories")
    .insert({ business_id: access.businessId, name, sort_order: (lastCategory?.sort_order ?? -1) + 1 })
    .select("id,business_id,name,is_active,sort_order,created_at,updated_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "A category with that name already exists." : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ...data, item_count: 0 }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let payload: { categoryId?: unknown; action?: unknown; name?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const categoryId = typeof payload.categoryId === "string" ? payload.categoryId : "";
  const action = payload.action;
  if (!categoryId || !["rename", "archive", "restore"].includes(String(action))) {
    return NextResponse.json({ error: "Invalid category action." }, { status: 400 });
  }

  const permission: MenuAction = action === "archive" ? "delete" : "edit";
  const access = await authorizeMenuRequest(req, permission);
  if ("response" in access) return access.response;

  if (action === "rename") {
    const name = readCategoryName(payload.name);
    if (!name || name.length > 60) {
      return NextResponse.json({ error: "Category name must be between 1 and 60 characters." }, { status: 400 });
    }

    const { data, error } = await access.supabase.rpc("rename_menu_category", {
      p_category_id: categoryId,
      p_business_id: access.businessId,
      p_new_name: name,
    });

    if (error) {
      const status = error.code === "23505" ? 409 : error.code === "P0002" ? 404 : 500;
      const message = error.code === "23505" ? "A category with that name already exists." : error.message;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ ...(data?.[0] ?? data), item_count: 0 });
  }

  const { data, error } = await access.supabase
    .from("menu_categories")
    .update({ is_active: action === "restore", updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("business_id", access.businessId)
    .select("id,business_id,name,is_active,sort_order,created_at,updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Category not found." }, { status: error ? 500 : 404 });
  }

  return NextResponse.json({ ...data, item_count: 0 });
}

export async function DELETE(req: NextRequest) {
  let payload: { categoryId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const categoryId = typeof payload.categoryId === "string" ? payload.categoryId : "";
  if (!categoryId) {
    return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
  }

  const access = await authorizeMenuRequest(req, "delete");
  if ("response" in access) return access.response;

  const { data, error } = await access.supabase.rpc("delete_menu_category", {
    p_category_id: categoryId,
    p_business_id: access.businessId,
  });

  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (data !== "deleted") {
    return NextResponse.json({ error: "This category still has menu items. Archive it instead." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}