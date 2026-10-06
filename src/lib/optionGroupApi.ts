import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
} from "@/lib/serverSupabase";
import type { StaffPermissionAction } from "@/lib/staffPermissions";

export type OptionGroupAction = "view" | "create" | "edit" | "delete";

export async function authorizeOptionGroupRequest(
  req: NextRequest,
  action: OptionGroupAction,
) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = owner ? null : await getStaffSessionFromRequest(req);

  if (!owner && !staffSession) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  if (staffSession) {
    const permission = staffSession.permissions.find((row) => row.module_name === "menu");
    const required: StaffPermissionAction = action;
    const allowed = action === "view"
      ? Boolean(permission?.can_view || permission?.can_create || permission?.can_edit || permission?.can_delete)
      : Boolean(permission?.[`can_${required}` as "can_create" | "can_edit" | "can_delete"]);

    if (!allowed) {
      return { response: NextResponse.json({ error: "You do not have permission to manage option groups." }, { status: 403 }) };
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