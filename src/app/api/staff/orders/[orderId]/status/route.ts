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
  const amount_received_raw = body.amount_received;
  const change_amount_raw = body.change_amount;
  const amount_received = amount_received_raw != null && amount_received_raw !== "" ? Number(amount_received_raw) : undefined;
  const change_amount = change_amount_raw != null && change_amount_raw !== "" ? Number(change_amount_raw) : undefined;

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
  if (amount_received !== undefined) updatePayload.amount_received = amount_received;
  if (change_amount !== undefined) updatePayload.change_amount = change_amount;

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

  // If payment info was provided, attempt to record a payments row (non-blocking)
  try {
    if ((amount_received !== undefined && amount_received !== null) || payment_method) {
      const paymentAmount = amount_received ?? (Number(data.total_amount || 0) - Number(data.discount_amount || 0));
      const paymentRow: Record<string, any> = {
        business_id: staffSession.businessId,
        order_id: orderId,
        amount: paymentAmount,
        currency: 'PHP',
        method: payment_method ?? data.payment_method ?? null,
        provider: payment_method === 'gcash' ? 'gcash' : null,
        reference_numb: reference_numb ?? null,
        status: 'completed',
        metadata: {
          recorded_by: staffSession.staffId,
        },
      };

      const { data: paymentInsert, error: paymentError } = await supabase.from('payments').insert(paymentRow).select().maybeSingle();
      if (paymentError) {
        console.warn('[POST /api/staff/orders/:orderId/status] failed to insert payments row', paymentError.message || paymentError);
      } else {
        console.log('[POST /api/staff/orders/:orderId/status] inserted payments row', { paymentInsert });
      }
    }
  } catch (err) {
    console.warn('[POST /api/staff/orders/:orderId/status] payments insert error (non-fatal)', err);
  }

  try {
    const { data: staffNameData, error: staffNameError } = await supabase
      .from("staff_accounts")
      .select("full_name")
      .eq("id", staffSession.staffId)
      .maybeSingle();

    if (staffNameError) {
      console.warn("Failed to load staff name for activity log", staffNameError);
    }

    const actorName =
      staffNameData?.full_name?.trim() ||
      "Unknown Staff";

    const { error: logError } = await supabase.from("order_activity_logs").insert([
      {
        order_id: orderId,
        business_id: staffSession.businessId,
        staff_id: staffSession.staffId,
        action: status,
        actor_name: actorName,
        metadata: {
          payment_method: payment_method ?? null,
          reference_numb: reference_numb ?? null,
          amount_received: amount_received ?? null,
          change_amount: change_amount ?? null,
        },
      },
    ]);

    if (logError) {
      console.warn("Failed to insert order activity log", logError);
    }
  } catch (err) {
    console.error("Error inserting order activity log", err);
  }

  return NextResponse.json(data);
}
