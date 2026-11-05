import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminResource } from "@/lib/adminResources";
import { requirePlatformAdmin } from "@/lib/platformAdmin";

interface RouteContext {
  params: Promise<{ resource: string }>;
}

function getAllowedPayload(body: unknown, allowedKeys: string[]) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      payload[key] = input[key];
    }
  }

  return payload;
}

function validatePayload(
  resource: NonNullable<ReturnType<typeof getAdminResource>>,
  payload: Record<string, unknown>,
) {
  for (const item of resource.fields) {
    if (!Object.prototype.hasOwnProperty.call(payload, item.key)) continue;
    const value = payload[item.key];
    if (value === null || value === "") {
      if (item.required) return `${item.label} is required.`;
      continue;
    }

    switch (item.type) {
      case "text":
        if (typeof value !== "string") return `${item.label} must be text.`;
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) return `${item.label} must be a valid number.`;
        break;
      case "boolean":
        if (typeof value !== "boolean") return `${item.label} must be true or false.`;
        break;
      case "json":
        if (typeof value !== "object") return `${item.label} must be valid JSON.`;
        break;
      case "date":
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return `${item.label} must be a valid date.`;
        break;
      case "enum":
        if (typeof value !== "string" || !item.options?.includes(value)) return `${item.label} has an invalid value.`;
        break;
    }
  }
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getRecordIdentity(id: string, resource: NonNullable<ReturnType<typeof getAdminResource>>) {
  const keyColumns = resource.keyColumns ?? [resource.idColumn];
  const values = id.split("~");
  if (values.length !== keyColumns.length || !values.every(isUuid)) return null;
  return Object.fromEntries(keyColumns.map((column, index) => [column, values[index]]));
}

function filterByIdentity<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  identity: Record<string, string>,
) {
  let filtered = query;
  for (const [column, value] of Object.entries(identity)) {
    filtered = filtered.eq(column, value);
  }
  return filtered;
}

function formatRecordIdentity(
  record: Record<string, unknown>,
  resource: NonNullable<ReturnType<typeof getAdminResource>>,
) {
  return (resource.keyColumns ?? [resource.idColumn])
    .map((column) => String(record[column]))
    .join("~");
}

async function writeAdminAudit(
  supabase: SupabaseClient,
  actorId: string,
  resourceName: string,
  action: "create" | "update" | "delete",
  recordId: string,
  changedFields: string[],
) {
  const { error } = await supabase.from("platform_admin_audit_logs").insert({
    actor_id: actorId,
    resource_name: resourceName,
    action,
    record_id: recordId,
    changed_fields: changedFields,
  });
  if (error) console.error("[platform admin] Failed to record admin audit event", error);
  return error;
}

type BusinessScope = { column: string; ids: string[] };
type ScopeFilter = { column: string; value: string } | { column: string; values: string[] };

async function findIds(
  supabase: SupabaseClient,
  table: string,
  selectColumn: string,
  filters: ScopeFilter[],
) {
  let query = supabase.from(table).select(selectColumn);
  for (const filter of filters) {
    if ("values" in filter && filter.values.length === 0) return [];
    query = "value" in filter
      ? query.eq(filter.column, filter.value)
      : query.in(filter.column, filter.values);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? [])
    .map((record) => (record as unknown as Record<string, unknown>)[selectColumn])
    .filter((value): value is string => typeof value === "string");
}

async function resolveBusinessScope(
  supabase: SupabaseClient,
  resourceName: string,
  businessId: string,
): Promise<BusinessScope> {
  const businessScopedTables = new Set([
    "menu_items", "menu_categories", "tables", "business_socials", "daily_sales",
    "order_ratings", "inventory_audit", "coupons", "coupon_claims", "staff_accounts",
    "staff_users", "staff_shift_logs", "order_activity_logs", "inventory_notifications",
    "payments", "option_groups", "business_staff",
  ]);
  if (resourceName === "businesses") return { column: "id", ids: [businessId] };
  if (businessScopedTables.has(resourceName)) return { column: "business_id", ids: [businessId] };

  if (resourceName === "users") {
    const ownerIds = await findIds(supabase, "businesses", "owner_id", [
      { column: "id", value: businessId },
    ]);
    const assignedStaffIds = await findIds(supabase, "staff_users", "user_id", [
      { column: "business_id", value: businessId },
    ]);
    const legacyStaffIds = await findIds(supabase, "business_staff", "user_id", [
      { column: "business_id", value: businessId },
    ]);
    return { column: "id", ids: [...new Set([...ownerIds, ...assignedStaffIds, ...legacyStaffIds])] };
  }

  if (resourceName === "option_choices") {
    const groupIds = await findIds(supabase, "option_groups", "id", [
      { column: "business_id", value: businessId },
    ]);
    return { column: "group_id", ids: groupIds };
  }
  if (resourceName === "menu_item_option_groups" || resourceName === "menu_item_bundles" ||
      resourceName === "item_option_groups" || resourceName === "saved_menus") {
    const menuItemIds = await findIds(supabase, "menu_items", "id", [
      { column: "business_id", value: businessId },
    ]);
    return {
      column: resourceName === "saved_menus" ? "menu_item_id" : "menu_item_id",
      ids: menuItemIds,
    };
  }
  if (resourceName === "menu_item_options") {
    const menuItemIds = await findIds(supabase, "menu_items", "id", [
      { column: "business_id", value: businessId },
    ]);
    const legacyGroupIds = await findIds(supabase, "menu_item_option_groups", "id", [
      { column: "menu_item_id", values: menuItemIds },
    ]);
    return { column: "group_id", ids: legacyGroupIds };
  }
  if (resourceName === "menu_item_bundle_items") {
    const menuItemIds = await findIds(supabase, "menu_items", "id", [
      { column: "business_id", value: businessId },
    ]);
    const bundleIds = await findIds(supabase, "menu_item_bundles", "id", [
      { column: "menu_item_id", values: menuItemIds },
    ]);
    return { column: "bundle_id", ids: bundleIds };
  }
  if (resourceName === "table_sessions") {
    const tableIds = await findIds(supabase, "tables", "id", [
      { column: "business_id", value: businessId },
    ]);
    return { column: "table_id", ids: tableIds };
  }
  if (resourceName === "coupon_usage") {
    const couponIds = await findIds(supabase, "coupons", "id", [
      { column: "business_id", value: businessId },
    ]);
    return { column: "coupon_id", ids: couponIds };
  }
  if (resourceName === "staff_permissions" || resourceName === "staff_sessions") {
    const staffIds = await findIds(supabase, "staff_accounts", "id", [
      { column: "business_id", value: businessId },
    ]);
    return { column: "staff_id", ids: staffIds };
  }

  throw new Error(`The ${resourceName} resource is not available in a restaurant workspace.`);
}

function applyBusinessScope<T extends { eq: (column: string, value: string) => T; in: (column: string, values: string[]) => T }>(
  query: T,
  scope: BusinessScope,
) {
  if (scope.ids.length === 0) {
    return query.eq(scope.column, "00000000-0000-0000-0000-000000000000");
  }
  if (scope.ids.length === 1) return query.eq(scope.column, scope.ids[0]);
  return query.in(scope.column, scope.ids);
}

async function validateScopedReferences(
  supabase: SupabaseClient,
  resourceName: string,
  businessId: string,
  payload: Record<string, unknown>,
) {
  const references: Record<string, Array<{ key: string; parent: string }>> = {
    option_choices: [{ key: "group_id", parent: "option_groups" }],
    menu_item_option_groups: [{ key: "menu_item_id", parent: "menu_items" }],
    menu_item_options: [{ key: "group_id", parent: "menu_item_option_groups" }],
    menu_item_bundles: [{ key: "menu_item_id", parent: "menu_items" }],
    menu_item_bundle_items: [{ key: "bundle_id", parent: "menu_item_bundles" }],
    staff_permissions: [{ key: "staff_id", parent: "staff_accounts" }],
    item_option_groups: [
      { key: "menu_item_id", parent: "menu_items" },
      { key: "option_group_id", parent: "option_groups" },
    ],
  };
  for (const reference of references[resourceName] ?? []) {
    const value = payload[reference.key];
    if (typeof value !== "string") continue;
    const parentResource = getAdminResource(reference.parent);
    if (!parentResource) return `Unknown related record type for ${reference.key.replaceAll("_", " ")}.`;
    const parentScope = await resolveBusinessScope(supabase, reference.parent, businessId);
    const parentIds = parentScope.column === parentResource.idColumn
      ? parentScope.ids
      : await findIds(supabase, parentResource.table, parentResource.idColumn, [
          { column: parentScope.column, values: parentScope.ids },
        ]);
    if (!parentIds.includes(value)) {
      return `${reference.key.replaceAll("_", " ")} must belong to the selected restaurant.`;
    }
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAdmin(req);
  if (!auth.ok) return auth.response;

  const { resource: resourceName } = await context.params;
  const resource = getAdminResource(resourceName);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  const businessId = req.nextUrl.searchParams.get("business_id");
  let businessScope: BusinessScope | null = null;
  if (businessId) {
    if (!isUuid(businessId)) return NextResponse.json({ error: "A valid restaurant ID is required." }, { status: 400 });
    try {
      businessScope = await resolveBusinessScope(auth.supabase, resourceName, businessId);
    } catch (scopeError) {
      const message = scopeError instanceof Error ? scopeError.message : "Unable to apply restaurant scope.";
      console.error(`[admin:${resourceName}] Business scope failed`, scopeError);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else if (resourceName !== "businesses" && resourceName !== "users") {
    return NextResponse.json({ error: "Select a restaurant to access its records." }, { status: 400 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const identity = getRecordIdentity(id, resource);
    if (!identity) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
    const query = auth.supabase
      .from(resource.table)
      .select(resource.columns.join(","));
    let recordQuery = filterByIdentity(query, identity);
    if (businessScope) recordQuery = applyBusinessScope(recordQuery, businessScope);
    const { data, error } = await recordQuery.maybeSingle();

    if (error) {
      console.error(`[admin:${resourceName}] Record lookup failed`, error);
      return NextResponse.json({ error: "Unable to load this record." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Record not found." }, { status: 404 });

    if (resourceName === "users") {
      const { data: authRecord, error: authRecordError } =
        await auth.supabase.auth.admin.getUserById(identity.id);
      if (authRecordError) {
        console.error("[admin:users] Auth account lookup failed", authRecordError);
        return NextResponse.json({ error: "Unable to load sign-in status." }, { status: 500 });
      }
      const bannedUntil = authRecord.user.banned_until;
      return NextResponse.json({
        record: {
          ...(data as unknown as Record<string, unknown>),
          account_status: bannedUntil && new Date(bannedUntil).getTime() > Date.now()
            ? "disabled"
            : "active",
        },
      });
    }

    return NextResponse.json({ record: data });
  }

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const requestedOffset = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  let query = auth.supabase
    .from(resource.table)
    .select(resource.columns.join(","), { count: "exact" });
  if (businessScope) query = applyBusinessScope(query, businessScope);

  if (resource.columns.includes("created_at")) {
    query = query.order("created_at", { ascending: false });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim();
  if (search && resource.searchColumns?.length) {
    const safeSearch = search.replace(/[,%()"'\\]/g, " ").trim();
    if (safeSearch) {
      const pattern = `%${safeSearch}%`;
      query = query.or(resource.searchColumns.map((column) => `${column}.ilike.${pattern}`).join(","));
    }
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error(`[admin:${resourceName}] List query failed`, error);
    return NextResponse.json({ error: "Unable to load records." }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [], count: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAdmin(req);
  if (!auth.ok) return auth.response;

  const { resource: resourceName } = await context.params;
  const resource = getAdminResource(resourceName);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  if (!resource.create) return NextResponse.json({ error: "Creating this record is not allowed." }, { status: 405 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  const allowedFields = resource.fields.map((item) => item.key);
  const payload = getAllowedPayload(body, allowedFields);
  if (!payload || Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Provide at least one editable field." }, { status: 400 });
  }

  const businessId = req.nextUrl.searchParams.get("business_id");
  if (resourceName !== "businesses") {
    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json({ error: "Select a restaurant to create this record." }, { status: 400 });
    }
    try {
      await resolveBusinessScope(auth.supabase, resourceName, businessId);
    } catch (scopeError) {
      console.error(`[admin:${resourceName}] Create scope failed`, scopeError);
      return NextResponse.json({ error: "Unable to verify this restaurant's data scope." }, { status: 400 });
    }
    if (resource.columns.includes("business_id")) payload.business_id = businessId;
    const referenceError = await validateScopedReferences(auth.supabase, resourceName, businessId, payload);
    if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  const missingRequired = resource.fields
    .filter((item) => item.required && (payload[item.key] === undefined || payload[item.key] === null || payload[item.key] === ""))
    .map((item) => item.label);
  if (missingRequired.length > 0) {
    return NextResponse.json({ error: `Required fields: ${missingRequired.join(", ")}.` }, { status: 400 });
  }
  const validationError = validatePayload(resource, payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await auth.supabase
    .from(resource.table)
    .insert(payload)
    .select(resource.columns.join(","))
    .single();

  if (error) {
    console.error(`[admin:${resourceName}] Create failed`, error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const createdRecord = data as unknown as Record<string, unknown>;
  const auditError = await writeAdminAudit(
    auth.supabase,
    auth.user.id,
    resourceName,
    "create",
    formatRecordIdentity(createdRecord, resource),
    Object.keys(payload),
  );
  return NextResponse.json({
    record: data,
    ...(auditError ? { warning: "The record was created, but the admin audit event could not be saved." } : {}),
  }, { status: 201 });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAdmin(req);
  if (!auth.ok) return auth.response;

  const { resource: resourceName } = await context.params;
  const resource = getAdminResource(resourceName);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  if (!resource.update) return NextResponse.json({ error: "Editing this record is not allowed." }, { status: 405 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A record ID and editable fields are required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const id = typeof input.id === "string" ? input.id : "";
  const identity = getRecordIdentity(id, resource);
  if (!identity) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
  const businessId = typeof input.business_id === "string"
    ? input.business_id
    : req.nextUrl.searchParams.get("business_id") ?? "";
  let businessScope: BusinessScope | null = null;
  if (resourceName !== "businesses" || businessId) {
    if (!isUuid(businessId)) {
      return NextResponse.json({ error: "Select a restaurant to edit this record." }, { status: 400 });
    }
    try {
      businessScope = await resolveBusinessScope(auth.supabase, resourceName, businessId);
    } catch (scopeError) {
      console.error(`[admin:${resourceName}] Update scope failed`, scopeError);
      return NextResponse.json({ error: "Unable to verify this restaurant's data scope." }, { status: 400 });
    }
    if (resourceName === "users" && !businessScope.ids.includes(identity.id)) {
      return NextResponse.json({ error: "User not found in the selected restaurant." }, { status: 404 });
    }
  }

  const editableKeys = resource.fields.map((item) => item.key);
  const payload = getAllowedPayload(input, editableKeys);
  if (!payload) return NextResponse.json({ error: "Editable fields are required." }, { status: 400 });
  delete payload.business_id;
  if (resourceName !== "businesses") {
    const referenceError = await validateScopedReferences(auth.supabase, resourceName, businessId, payload);
    if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });
  }
  const validationError = validatePayload(resource, payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const changedFields = Object.keys(payload);
  let accountStatusUpdated = false;
  let inventoryBefore: { business_id: string; current_stock: number | null } | null = null;

  if (resourceName === "menu_items" && Object.prototype.hasOwnProperty.call(payload, "current_stock")) {
    const { data: itemBefore, error: itemLookupError } = await auth.supabase
      .from("menu_items")
      .select("business_id,current_stock")
      .eq("id", id)
      .maybeSingle();
    if (itemLookupError) {
      console.error("[admin:menu_items] Inventory history lookup failed", itemLookupError);
      return NextResponse.json({ error: "Unable to verify the previous inventory value." }, { status: 500 });
    }
    if (!itemBefore) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    inventoryBefore = itemBefore as unknown as { business_id: string; current_stock: number | null };
  }

  if (resourceName === "users" && typeof payload.account_status === "string") {
    if (payload.account_status !== "active" && payload.account_status !== "disabled") {
      return NextResponse.json({ error: "Sign-in access must be active or disabled." }, { status: 400 });
    }
    const { error: authUpdateError } = await auth.supabase.auth.admin.updateUserById(id, {
      ban_duration: payload.account_status === "disabled" ? "876000h" : "none",
    });
    if (authUpdateError) {
      console.error("[admin:users] Failed to change sign-in access", authUpdateError);
      return NextResponse.json({ error: "Unable to update sign-in access." }, { status: 500 });
    }
    accountStatusUpdated = true;
    delete payload.account_status;
  }

  if (Object.keys(payload).length === 0) {
    if (!accountStatusUpdated) {
      return NextResponse.json({ error: "No editable changes were submitted." }, { status: 400 });
    }

    const { data: userRecord, error: userRecordError } = await auth.supabase
      .from(resource.table)
      .select(resource.columns.join(","))
      .eq(resource.idColumn, id)
      .maybeSingle();
    if (userRecordError) {
      console.error("[admin:users] Access changed, but profile lookup failed", userRecordError);
      return NextResponse.json({ error: "Sign-in access changed, but the profile could not be reloaded." }, { status: 500 });
    }
    if (!userRecord) return NextResponse.json({ error: "User profile not found." }, { status: 404 });

    const auditError = await writeAdminAudit(
      auth.supabase,
      auth.user.id,
      resourceName,
      "update",
      id,
      changedFields,
    );
    return NextResponse.json({
      record: userRecord,
      ...(auditError ? { warning: "Sign-in access changed, but the admin audit event could not be saved." } : {}),
    });
  }

  const updateQuery = auth.supabase
    .from(resource.table)
    .update(payload);
  let scopedUpdateQuery = filterByIdentity(updateQuery, identity);
  if (businessScope) scopedUpdateQuery = applyBusinessScope(scopedUpdateQuery, businessScope);
  const { data, error } = await scopedUpdateQuery
    .select(resource.columns.join(","))
    .maybeSingle();

  if (error) {
    console.error(`[admin:${resourceName}] Update failed`, error);
    return NextResponse.json({
      error: accountStatusUpdated
        ? "Sign-in access changed, but profile updates failed."
        : error.message,
    }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "Record not found." }, { status: 404 });

  let auditWarning: string | undefined;
  const auditError = await writeAdminAudit(
    auth.supabase,
    auth.user.id,
    resourceName,
    "update",
    id,
    changedFields,
  );
  if (auditError) auditWarning = "The record changed, but the admin audit event could not be saved.";

  if (inventoryBefore && payload.current_stock !== inventoryBefore.current_stock) {
    const { error: inventoryLogError } = await auth.supabase.from("inventory_audit").insert({
      business_id: inventoryBefore.business_id,
      menu_item_id: id,
      previous_stock: inventoryBefore.current_stock,
      new_stock: payload.current_stock,
      change_reason: "platform_admin_edit",
      changed_by: auth.user.id,
    });
    if (inventoryLogError) {
      console.error("[admin:menu_items] Stock changed, but inventory audit insert failed", inventoryLogError);
      auditWarning = [auditWarning, "Stock changed, but its inventory audit event could not be saved."]
        .filter(Boolean)
        .join(" ");
    }
  }

  if (resourceName === "orders" && typeof payload.status === "string") {
    const updatedOrder = data as unknown as Record<string, unknown>;
    const { error: logError } = await auth.supabase.from("order_activity_logs").insert({
      order_id: id,
      business_id: updatedOrder.business_id,
      staff_id: null,
      owner_id: null,
      action: `platform_admin_status_${payload.status}`,
      actor_name: auth.user.email ?? auth.user.id,
      metadata: { status: payload.status, platform_admin_id: auth.user.id },
    });
    if (logError) {
      console.error("[admin:orders] Status updated, but audit event could not be recorded", logError);
      auditWarning = [auditWarning, "The order status changed, but its order activity log could not be saved."]
        .filter(Boolean)
        .join(" ");
    }
  }

  return NextResponse.json({ record: data, ...(auditWarning ? { warning: auditWarning } : {}) });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAdmin(req);
  if (!auth.ok) return auth.response;

  const { resource: resourceName } = await context.params;
  const resource = getAdminResource(resourceName);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  if (!resource.delete) return NextResponse.json({ error: "Deleting this record is not allowed." }, { status: 405 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const identity = getRecordIdentity(id, resource);
  if (!identity) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
  const businessId = req.nextUrl.searchParams.get("business_id");
  let businessScope: BusinessScope | null = null;
  if (resourceName !== "businesses" || businessId) {
    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json({ error: "Select a restaurant to delete this record." }, { status: 400 });
    }
    try {
      businessScope = await resolveBusinessScope(auth.supabase, resourceName, businessId);
    } catch (scopeError) {
      console.error(`[admin:${resourceName}] Delete scope failed`, scopeError);
      return NextResponse.json({ error: "Unable to verify this restaurant's data scope." }, { status: 400 });
    }
  }

  const protectedReferences: Record<string, Array<{ table: string; column: string }>> = {
    businesses: [
      { table: "inventory_audit", column: "business_id" },
      { table: "order_activity_logs", column: "business_id" },
      { table: "daily_sales", column: "business_id" },
      { table: "staff_shift_logs", column: "business_id" },
    ],
    menu_items: [{ table: "inventory_audit", column: "menu_item_id" }],
    coupons: [
      { table: "coupon_usage", column: "coupon_id" },
      { table: "coupon_claims", column: "coupon_id" },
    ],
    staff_accounts: [{ table: "staff_shift_logs", column: "staff_id" }],
    tables: [{ table: "table_sessions", column: "table_id" }],
  };
  for (const reference of protectedReferences[resourceName] ?? []) {
    const { count, error: referenceError } = await auth.supabase
      .from(reference.table)
      .select("id", { count: "exact", head: true })
      .eq(reference.column, id);
    if (referenceError) {
      console.error(`[admin:${resourceName}] Delete safety check failed`, referenceError);
      return NextResponse.json({ error: "Unable to verify whether this record has protected history." }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: "This record has linked history and cannot be deleted. Deactivate or archive it instead.",
      }, { status: 409 });
    }
  }

  const deleteQuery = auth.supabase
    .from(resource.table)
    .delete();
  let scopedDeleteQuery = filterByIdentity(deleteQuery, identity);
  if (businessScope) scopedDeleteQuery = applyBusinessScope(scopedDeleteQuery, businessScope);
  const { data, error } = await scopedDeleteQuery
    .select(resource.idColumn)
    .maybeSingle();

  if (error) {
    console.error(`[admin:${resourceName}] Delete failed`, error);
    return NextResponse.json({
      error: "Delete failed. The record may still be referenced by protected history or related records.",
    }, { status: 409 });
  }
  if (!data) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  const auditError = await writeAdminAudit(auth.supabase, auth.user.id, resourceName, "delete", id, []);
  return NextResponse.json({
    success: true,
    ...(auditError ? { warning: "The record was deleted, but the admin audit event could not be saved." } : {}),
  });
}
