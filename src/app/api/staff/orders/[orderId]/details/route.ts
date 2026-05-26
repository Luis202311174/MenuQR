import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function GET(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId || req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  if (!orderId) {
    return new NextResponse("Order ID is required", { status: 400 });
  }

  const staffSession = await getStaffSessionFromRequest(req);
  if (!staffSession) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, table:table_id(id, table_number)")
    .eq("id", orderId)
    .eq("business_id", staffSession.businessId)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/staff/orders/[orderId]/details]", error);
    return new NextResponse(error.message || "Failed to load order details", { status: 500 });
  }

  if (!data) {
    return new NextResponse("Order not found", { status: 404 });
  }

  return NextResponse.json(data);
}
