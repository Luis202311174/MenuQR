import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/serverSupabase";
import { hashSessionToken } from "@/lib/staffAuth";
import { isValidStaffStatus, normalizeStaffStatus } from "@/lib/staffPermissions";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("staff_session")?.value;
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tokenHash = hashSessionToken(token);
  const supabase = createServerSupabaseAdminClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("staff_sessions")
    .select("staff_id, business_id, expires_at, is_active")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .single();

  if (sessionError || !sessionData) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const expiresAt = new Date(sessionData.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    return new NextResponse("Session expired", { status: 401 });
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_accounts")
    .select("id, full_name, email, role, status, last_login_at, business_id")
    .eq("id", sessionData.staff_id)
    .single();

  if (staffError || !staff) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const normalizedStatus = normalizeStaffStatus(staff.status);
  if (!isValidStaffStatus(normalizedStatus)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("staff_permissions")
    .select("id, module_name, can_view, can_create, can_edit, can_delete")
    .eq("staff_id", staff.id);

  if (permissionsError) {
    return new NextResponse("Failed to load permissions", { status: 500 });
  }

  return NextResponse.json({
    staffId: staff.id,
    businessId: staff.business_id,
    fullName: staff.full_name,
    email: staff.email,
    role: staff.role,
    status: normalizedStatus,
    lastLoginAt: staff.last_login_at,
    permissions: permissions ?? [],
  });
}
