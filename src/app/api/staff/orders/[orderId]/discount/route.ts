import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId;
  if (!orderId) return new NextResponse("Order ID required", { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const action = (body.action || "").toString().trim().toLowerCase();
  if (!action || !["approve", "reject"].includes(action)) {
    return new NextResponse("Invalid action", { status: 400 });
  }

  const staffSession = await getStaffSessionFromRequest(req);
  if (!staffSession) return new NextResponse("Unauthorized", { status: 401 });

  const orderPermission = staffSession.permissions.find((p: any) => p.module_name === "orders");
  if (!orderPermission?.can_edit) return new NextResponse("Forbidden", { status: 403 });

  const supabase = createServerSupabaseAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, total_amount, discount_amount, coupon_id")
    .eq("id", orderId)
    .eq("business_id", staffSession.businessId)
    .maybeSingle();

  if (fetchError) return new NextResponse(fetchError.message || "Failed to fetch order", { status: 500 });
  if (!order) return new NextResponse("Order not found", { status: 404 });

  if (action === "approve") {
    const { data, error } = await supabase
      .from("orders")
      .update({ discount_approved: true })
      .eq("id", orderId)
      .eq("business_id", staffSession.businessId)
      .select()
      .maybeSingle();

    if (error) return new NextResponse(error.message || "Failed to approve discount", { status: 500 });
    return NextResponse.json(data);
  }

  // reject
  const discountAmount = Number(order.discount_amount || 0);
  const originalTotal = Number(order.total_amount || 0) + discountAmount;

  const { data, error } = await supabase
    .from("orders")
    .update({ discount_amount: 0, discount_approved: false, total_amount: originalTotal, coupon_id: null })
    .eq("id", orderId)
    .eq("business_id", staffSession.businessId)
    .select()
    .maybeSingle();

  if (error) return new NextResponse(error.message || "Failed to reject discount", { status: 500 });
  return NextResponse.json(data);
}
