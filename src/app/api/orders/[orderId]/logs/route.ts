import { NextRequest, NextResponse } from "next/server";
import { getStaffSessionFromRequest, getOwnerUserFromRequest, createServerSupabaseAdminClient } from "@/lib/serverSupabase";

export async function GET(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId || req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  if (!orderId) return NextResponse.json([], { status: 200 });

  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);
  if (!owner && !staffSession) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("id, order_id, staff_id, actor_name, action, metadata, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/orders/:orderId/logs] error", error);
      return new NextResponse(error.message || "Failed to load order logs", { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message || "Failed to load order logs", { status: 500 });
  }
}
