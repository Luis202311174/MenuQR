import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
  hasStaffManagePermissions,
} from "@/lib/serverSupabase";

function createJsonError(message: string, status = 500, details?: string) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: { staffId: string };
  }
) {
  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);

  if (!owner && !staffSession) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (staffSession && !hasStaffManagePermissions(staffSession)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const staffId = params?.staffId || url.searchParams.get("staffId");
  if (!staffId) {
    return createJsonError("Staff ID is required", 400);
  }

  const supabase = createServerSupabaseAdminClient();

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

  const { data: staffRecord, error: staffError } = await supabase
    .from("staff_accounts")
    .select("id")
    .eq("id", staffId)
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();

  if (staffError || !staffRecord) {
    return createJsonError(
      "Staff account not found",
      404,
      staffError?.message
    );
  }

  const { data, error } = await supabase
    .from("staff_shift_logs")
    .select("id, action, created_at")
    .eq("staff_id", staffId)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[GET /api/staff/shift/logs/[staffId]]", error);
    return createJsonError("Unable to load staff logs", 500, error.message);
  }

  return NextResponse.json(data || []);
}
