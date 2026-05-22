import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/serverSupabase";
import { hashSessionToken } from "@/lib/staffAuth";
import { isValidStaffStatus, normalizeStaffStatus } from "@/lib/staffPermissions";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseAdminClient();
  
  // First try staff session token
  const staffToken = req.cookies.get("staff_session")?.value;
  if (staffToken) {
    const tokenHash = hashSessionToken(staffToken);

    const { data: sessionData, error: sessionError } = await supabase
      .from("staff_sessions")
      .select("staff_id, business_id, expires_at, is_active")
      .eq("token_hash", tokenHash)
      .eq("is_active", true)
      .single();

    if (!sessionError && sessionData) {
      const expiresAt = new Date(sessionData.expires_at);
      if (expiresAt.getTime() >= Date.now()) {
        // Valid staff session - continue with existing logic
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
          isOwner: false,
        });
      }
    }
  }

  // Fallback: Check if owner is logged in via Supabase Auth
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (authUser) {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, fname, lname, role")
      .eq("id", authUser.id)
      .eq("role", "owner")
      .single();

    if (!userError && user) {
      // Get owner's business
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!businessError && business) {
        return NextResponse.json({
          staffId: user.id,
          businessId: business.id,
          fullName: `${user.fname || ""} ${user.lname || ""}`.trim(),
          email: user.email,
          role: "owner",
          status: "active",
          lastLoginAt: null,
          permissions: [
            { module_name: "dashboard", can_view: true, can_create: false, can_edit: false, can_delete: false },
            { module_name: "orders", can_view: true, can_create: true, can_edit: true, can_delete: false },
            { module_name: "menu", can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module_name: "staff", can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module_name: "analytics", can_view: true, can_create: false, can_edit: false, can_delete: false },
          ],
          isOwner: true,
        });
      }
    }
  }

  return new NextResponse("Unauthorized", { status: 401 });
}