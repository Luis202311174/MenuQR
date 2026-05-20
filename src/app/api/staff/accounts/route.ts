import { NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
  hasStaffManagePermissions,
} from "@/lib/serverSupabase";
import { hashPassword } from "@/lib/staffAuth";
import { getDefaultPermissionsForRole } from "@/lib/staffPermissions";

function createJsonError(message: string, status = 500, details?: string) {
  return NextResponse.json({ error: message, details }, { status });
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
}

export async function GET(req: Request) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);
  if (!owner && !staffSession) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (staffSession && !hasStaffManagePermissions(staffSession)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const authToken = getBearerToken(req);
  const supabase = authToken ? createServerSupabaseClient(authToken) : createServerSupabaseAdminClient();
  const businessId = owner
    ? (await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", owner.id)
        .limit(1)
        .maybeSingle()).data?.id
    : staffSession.businessId;

  if (!businessId) {
    return createJsonError("Business not found", 404, "No business found for current owner or staff session.");
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const role = url.searchParams.get("role")?.trim().toLowerCase() ?? "";

  let query = supabase
    .from("staff_accounts")
    .select("id, full_name, email, role, status, created_at, last_login_at, staff_permissions(*)")
    .eq("business_id", businessId);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return createJsonError("Unable to load staff accounts", 500, error.message);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);
  if (!owner && !staffSession) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (staffSession && !hasStaffManagePermissions(staffSession)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const fullName = (body.fullName || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const password = (body.password || "").toString();
  const role = (body.role || "custom").toString().trim().toLowerCase();
  const status = (body.status || "active").toString().trim().toLowerCase();
  const inputPermissions = Array.isArray(body.permissions) ? body.permissions : null;
  const normalizedRole = ["cashier", "waiter", "kitchen staff", "manager", "inventory staff", "custom"].includes(role)
    ? role
    : "custom";

  if (!fullName || !email || !password) {
    return new NextResponse("Missing required staff account fields", { status: 400 });
  }

  const authToken = getBearerToken(req);
  const supabase = authToken ? createServerSupabaseClient(authToken) : createServerSupabaseAdminClient();
  const businessId = owner
    ? (await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", owner.id)
        .limit(1)
        .maybeSingle()).data?.id
    : staffSession.businessId;

  if (!businessId) {
    return createJsonError("Business not found", 404, "No business found for current owner or staff session.");
  }

  const passwordHash = hashPassword(password);
  const { data: createdStaff, error: createError } = await supabase.from("staff_accounts").insert({
    full_name: fullName,
    email,
    password_hash: passwordHash,
    role: normalizedRole,
    status,
    business_id: businessId,
  }).select("id").single();

  if (createError || !createdStaff?.id) {
    return createJsonError("Unable to create staff account", 500, createError?.message);
  }

  const permissionRows = inputPermissions && inputPermissions.length > 0
    ? inputPermissions.map((permission: any) => ({
        staff_id: createdStaff.id,
        module_name: permission.module_name,
        can_view: Boolean(permission.can_view),
        can_create: Boolean(permission.can_create),
        can_edit: Boolean(permission.can_edit),
        can_delete: Boolean(permission.can_delete),
      }))
    : getDefaultPermissionsForRole(role || "custom").map((permission) => ({
        ...permission,
        staff_id: createdStaff.id,
      }));

  const { error: permError } = await supabase.from("staff_permissions").insert(permissionRows);
  if (permError) {
    return createJsonError("Unable to save permissions", 500, permError.message);
  }

  return NextResponse.json({ success: true });
}
