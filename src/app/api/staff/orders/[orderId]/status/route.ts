import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

const ALLOWED_STATUSES = [
  "received",
  "paid",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];

export async function POST(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId || req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  if (!orderId) {
    return new NextResponse("Order ID is required", { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const status = (body.status || "").toString().trim().toLowerCase();
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return new NextResponse("Invalid order status", { status: 400 });
  }

  const payment_method = body.payment_method ? String(body.payment_method) : undefined;
  const reference_numb = body.reference_numb ? String(body.reference_numb) : undefined;

  console.log("[POST /api/staff/orders/:orderId/status] incoming", { orderId, status, payment_method, reference_numb });
  const staffSession = await getStaffSessionFromRequest(req);
  console.log("[POST /api/staff/orders/:orderId/status] staffSession:", staffSession ? { staffId: staffSession.staffId, businessId: staffSession.businessId, role: staffSession.role } : null);
  if (!staffSession) {
    console.warn("[POST /api/staff/orders/:orderId/status] no staff session found");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const orderPermission = staffSession.permissions.find(
    (permission: any) => permission.module_name === "orders"
  );
  console.log("[POST /api/staff/orders/:orderId/status] orderPermission:", orderPermission);
  if (!orderPermission?.can_edit) {
    console.warn("[POST /api/staff/orders/:orderId/status] staff lacks can_edit on orders");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = createServerSupabaseAdminClient();
  const updatePayload: Record<string, any> = { status };
  if (status === "paid") {
    updatePayload.is_paid = true;
  }

  if (payment_method) updatePayload.payment_method = payment_method;
  if (reference_numb) updatePayload.reference_numb = reference_numb;

  const { data, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("business_id", staffSession.businessId)
    .select()
    .maybeSingle();

  console.log("[POST /api/staff/orders/:orderId/status] update result", { data, error });
  if (error) {
    console.error("[POST /api/staff/orders/:orderId/status] update error", error);
    return new NextResponse(error.message || "Failed to update order status", {
      status: 500,
    });
  }

  if (!data) {
    return new NextResponse("Order not found or not accessible", { status: 404 });
  }

  return NextResponse.json(data);
}
