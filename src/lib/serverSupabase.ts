import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { hashSessionToken } from "@/lib/staffAuth";
import { isValidStaffStatus, normalizeStaffStatus } from "@/lib/staffPermissions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export function createServerSupabaseClient(
  authToken?: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authToken
      ? {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      : undefined,
  });
}

export function createServerSupabaseAdminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. The server admin Supabase client requires the service role key."
    );
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

interface StaffPermissionRow {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface StaffSessionResult {
  staffId: string;
  businessId: string;
  role: string;
  status: string;
  permissions: StaffPermissionRow[];
}

export async function getOwnerUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const supabaseToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;
  if (!supabaseToken) return null;

  const supabase = createServerSupabaseClient(supabaseToken);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("id,role,email")
    .eq("id", userData.user.id)
    .single();

  if (userRecord && userRecord.role === "owner") {
    return userRecord;
  }

  if (!userData.user.email) {
    return null;
  }

  const { data: emailRecord } = await supabase
    .from("users")
    .select("id,role,email")
    .eq("email", userData.user.email)
    .eq("role", "owner")
    .limit(1)
    .single();

  return emailRecord || null;
}

export async function getStaffSessionFromRequest(req: NextRequest): Promise<StaffSessionResult | null> {
  const token = req.cookies.get("staff_session")?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const supabase = createServerSupabaseClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("staff_sessions")
    .select("staff_id, business_id, expires_at, is_active")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .single();

  if (sessionError || !sessionData) {
    return null;
  }

  const expiresAt = new Date(sessionData.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    return null;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_accounts")
    .select("id, role, status, business_id")
    .eq("id", sessionData.staff_id)
    .single();

  if (staffError || !staff) {
    return null;
  }

  const normalizedStatus = normalizeStaffStatus(staff.status);
  if (!isValidStaffStatus(normalizedStatus)) {
    return null;
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("staff_permissions")
    .select("module_name,can_view,can_create,can_edit,can_delete")
    .eq("staff_id", staff.id);

  if (permissionsError) {
    return null;
  }

  return {
    staffId: staff.id,
    businessId: sessionData.business_id,
    role: staff.role,
    status: normalizedStatus,
    permissions: permissions ?? [],
  };
}

export function hasStaffManagePermissions(staffSession: StaffSessionResult | null): boolean {
  if (!staffSession) {
    return false;
  }

  const settingsPermission = staffSession.permissions.find((permission) => permission.module_name === "settings");
  return Boolean(settingsPermission?.can_create);
}
