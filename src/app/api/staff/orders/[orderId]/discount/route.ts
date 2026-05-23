import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getStaffSessionFromRequest,
} from "@/lib/serverSupabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  let finalOrderId = orderId;

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (!finalOrderId && body?.orderId) {
    finalOrderId = body.orderId?.toString();
  }

  if (!finalOrderId) {
    return new NextResponse("Order ID required", { status: 400 });
  }

  const action = (body?.action || "")
    .toString()
    .trim()
    .toLowerCase();

  if (!["approve", "reject"].includes(action)) {
    return new NextResponse("Invalid action", { status: 400 });
  }

  const staffSession = await getStaffSessionFromRequest(req);

  if (!staffSession) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const orderPermission = staffSession.permissions.find(
    (p: any) => p.module_name === "orders"
  );

  if (!orderPermission?.can_edit) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = createServerSupabaseAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, total_amount, discount_amount, coupon_id")
    .eq("id", finalOrderId)
    .eq("business_id", staffSession.businessId)
    .maybeSingle();

  if (fetchError) {
    return new NextResponse(
      fetchError.message || "Failed to fetch order",
      { status: 500 }
    );
  }

  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  if (action === "approve") {
    const { data, error } = await supabase
      .from("orders")
      .update({ discount_approved: true })
      .eq("id", finalOrderId)
      .eq("business_id", staffSession.businessId)
      .select()
      .maybeSingle();

    if (error) {
      return new NextResponse(
        error.message || "Failed to approve discount",
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }

  const discountAmount = Number(order.discount_amount || 0);
  const originalTotal =
    Number(order.total_amount || 0) + discountAmount;

  const { data, error } = await supabase
    .from("orders")
    .update({
      discount_amount: 0,
      discount_approved: false,
      total_amount: originalTotal,
      coupon_id: null,
    })
    .eq("id", finalOrderId)
    .eq("business_id", staffSession.businessId)
    .select()
    .maybeSingle();

  if (error) {
    return new NextResponse(
      error.message || "Failed to reject discount",
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}