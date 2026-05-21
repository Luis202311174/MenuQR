import { NextRequest, NextResponse } from "next/server";
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

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;
}

/* -------------------- GET -------------------- */
export async function GET(req: NextRequest) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);

  if (!owner && !staffSession) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (staffSession && !hasStaffManagePermissions(staffSession)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const authToken = getBearerToken(req);

  const supabase = authToken
    ? createServerSupabaseClient(authToken)
    : createServerSupabaseAdminClient();

  const businessId = owner
    ? (
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", owner.id)
          .limit(1)
          .maybeSingle()
      ).data?.id
    : staffSession!.businessId;

  if (!businessId) {
    return createJsonError(
      "Business not found",
      404,
      "No business found for current owner or staff session."
    );
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const role = url.searchParams.get("role")?.trim().toLowerCase() ?? "";

  let query = supabase
    .from("staff_accounts")
    .select(
      "id, full_name, email, role, status, created_at, last_login_at, staff_permissions(*)"
    )
    .eq("business_id", businessId);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("[GET /api/staff/accounts]", error);

    return createJsonError(
      "Unable to load staff accounts",
      500,
      error.message
    );
  }

  return NextResponse.json(data ?? []);
}

/* -------------------- POST -------------------- */
export async function POST(req: NextRequest) {
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

  const role = (body.role || "custom")
    .toString()
    .trim()
    .toLowerCase();

  const status = (body.status || "active")
    .toString()
    .trim()
    .toLowerCase();

  const inputPermissions = Array.isArray(body.permissions)
    ? body.permissions
    : null;

  const normalizedRole = [
    "cashier",
    "waiter",
    "kitchen staff",
    "manager",
    "inventory staff",
    "custom",
  ].includes(role)
    ? role
    : "custom";

  if (!fullName || !email || !password) {
    return new NextResponse("Missing required fields", {
      status: 400,
    });
  }

  const authToken = getBearerToken(req);

  const supabase = authToken
    ? createServerSupabaseClient(authToken)
    : createServerSupabaseAdminClient();

  let adminSupabase;
  try {
    adminSupabase = createServerSupabaseAdminClient();
  } catch (error) {
    return createJsonError(
      "Server misconfiguration",
      500,
      error instanceof Error ? error.message : "Missing Supabase service role key."
    );
  }

  const cleanupAuthUser = async (authUserId: string) => {
    try {
      await adminSupabase.from("users").delete().eq("id", authUserId);
    } catch {
      // ignore cleanup failures
    }

    try {
      await adminSupabase.auth.admin.deleteUser(authUserId);
    } catch {
      // ignore cleanup failures
    }
  };

  const businessId = owner
    ? (
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", owner.id)
          .limit(1)
          .maybeSingle()
      ).data?.id
    : staffSession!.businessId;

  if (!businessId) {
    return createJsonError(
      "Business not found",
      404,
      "No business found for current owner or staff session."
    );
  }

  let authUserId: string | null = null;
  let authErrorMessage: string | null = null;

  const createResult = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "staff",
      business_id: businessId,
    },
  });

  if (createResult.error) {
    authErrorMessage = createResult.error.message;
    console.error("[POST /api/staff/accounts] auth.admin.createUser error", createResult.error);

    // If the auth user already exists, use the existing auth user.
    if (
      authErrorMessage.includes("User already registered") ||
      authErrorMessage.includes("duplicate key") ||
      authErrorMessage.includes("already exists")
    ) {
      // Try to find an existing auth profile in the `users` table as a fallback
      const { data: existingUserRecord, error: userFetchError } = await adminSupabase
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (userFetchError || !existingUserRecord?.id) {
        console.error("[POST /api/staff/accounts] unable to locate existing auth user by email", userFetchError);
        return createJsonError(
          "Unable to create staff authentication user",
          500,
          authErrorMessage
        );
      }

      authUserId = existingUserRecord.id;
    } else {
      return createJsonError(
        "Unable to create staff authentication user",
        500,
        authErrorMessage
      );
    }
  } else {
    authUserId = createResult.data?.user?.id ?? null;
  }

  if (!authUserId) {
    return createJsonError(
      "Unable to create staff authentication user",
      500,
      authErrorMessage || "No auth user returned"
    );
  }

  const { error: authProfileError } = await adminSupabase
    .from("users")
    .upsert(
      { id: authUserId, role: "staff", email, created_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (authProfileError) {
    await adminSupabase.auth.admin.deleteUser(authUserId).catch(() => null);
    return createJsonError(
      "Unable to create staff auth profile",
      500,
      authProfileError.message
    );
  }

  const passwordHash = hashPassword(password);

  const { data: createdStaff, error: createError } =
    await supabase
      .from("staff_accounts")
      .insert({
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role: normalizedRole,
        status,
        business_id: businessId,
      })
      .select("id")
      .single();

  if (createError || !createdStaff?.id) {
    await cleanupAuthUser(authUserId);
    return createJsonError(
      "Unable to create staff account",
      500,
      createError?.message
    );
  }

  const permissionRows =
    inputPermissions && inputPermissions.length > 0
      ? inputPermissions.map((p: any) => ({
          staff_id: createdStaff.id,
          module_name: p.module_name,
          can_view: Boolean(p.can_view),
          can_create: Boolean(p.can_create),
          can_edit: Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        }))
      : getDefaultPermissionsForRole(role || "custom").map(
          (p) => ({
            ...p,
            staff_id: createdStaff.id,
          })
        );

  const { error: permError } = await supabase
    .from("staff_permissions")
    .insert(permissionRows);

  if (permError) {
    try {
      await supabase.from("staff_accounts").delete().eq("id", createdStaff.id);
    } catch {
      // ignore cleanup failures
    }
    await cleanupAuthUser(authUserId);
    return createJsonError(
      "Unable to save permissions",
      500,
      permError.message
    );
  }

  return NextResponse.json({ success: true });
}