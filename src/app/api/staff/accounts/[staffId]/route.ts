import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
  hasStaffManagePermissions,
} from "@/lib/serverSupabase";
import { hashPassword } from "@/lib/staffAuth";

function createJsonError(
  message: string,
  status = 500,
  details?: string
) {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;

    const owner = await getOwnerUserFromRequest(req);
    const staffSession = await getStaffSessionFromRequest(req);

    if (!owner && !staffSession) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (
      staffSession &&
      !hasStaffManagePermissions(staffSession)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : undefined;

    const password =
      typeof body.password === "string"
        ? body.password
        : undefined;

    const role =
      typeof body.role === "string"
        ? body.role.trim().toLowerCase()
        : undefined;

    const status =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : undefined;

    const inputPermissions = Array.isArray(body.permissions)
      ? body.permissions
      : null;

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

    const { data: staff, error: staffError } = await supabase
      .from("staff_accounts")
      .select("id, business_id")
      .eq("id", staffId)
      .single();

    if (staffError || !staff) {
      return new NextResponse("Staff not found", {
        status: 404,
      });
    }

    if (staff.business_id !== businessId) {
      return new NextResponse("Forbidden", {
        status: 403,
      });
    }

    const updatePayload: Record<string, any> = {};

    if (fullName) {
      updatePayload.full_name = fullName;
    }

    if (role) {
      updatePayload.role = role;
    }

    if (status) {
      updatePayload.status = status;
    }

    if (password) {
      updatePayload.password_hash = hashPassword(password);
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("staff_accounts")
        .update(updatePayload)
        .eq("id", staffId);

      if (updateError) {
        return createJsonError(
          "Unable to update staff account",
          500,
          updateError.message
        );
      }
    }

    if (inputPermissions) {
      const { error: deleteError } = await supabase
        .from("staff_permissions")
        .delete()
        .eq("staff_id", staffId);

      if (deleteError) {
        return createJsonError(
          "Unable to clear existing permissions",
          500,
          deleteError.message
        );
      }

      const permissionRows = inputPermissions.map(
        (permission: any) => ({
          staff_id: staffId,
          module_name: permission.module_name,
          can_view: Boolean(permission.can_view),
          can_create: Boolean(permission.can_create),
          can_edit: Boolean(permission.can_edit),
          can_delete: Boolean(permission.can_delete),
        })
      );

      if (permissionRows.length > 0) {
        const { error: permError } = await supabase
          .from("staff_permissions")
          .insert(permissionRows);

        if (permError) {
          return createJsonError(
            "Unable to update permissions",
            500,
            permError.message
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH staffId route]", error);

    return createJsonError(
      "Unexpected server error",
      500,
      error?.message
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;

    const owner = await getOwnerUserFromRequest(req);
    const staffSession = await getStaffSessionFromRequest(req);

    if (!owner && !staffSession) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (
      staffSession &&
      !hasStaffManagePermissions(staffSession)
    ) {
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

    const { data: staff, error: staffError } = await supabase
      .from("staff_accounts")
      .select("id, business_id")
      .eq("id", staffId)
      .single();

    if (staffError || !staff) {
      return new NextResponse("Staff not found", {
        status: 404,
      });
    }

    if (staff.business_id !== businessId) {
      return new NextResponse("Forbidden", {
        status: 403,
      });
    }

    const { error } = await supabase
      .from("staff_accounts")
      .update({ status: "disabled" })
      .eq("id", staffId);

    if (error) {
      return createJsonError(
        "Unable to disable staff account",
        500,
        error.message
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE staffId route]", error);

    return createJsonError(
      "Unexpected server error",
      500,
      error?.message
    );
  }
}