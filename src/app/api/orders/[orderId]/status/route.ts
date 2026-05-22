import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getOwnerUserFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId || req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  if (!orderId) return new NextResponse("Order ID required", { status: 400 });

  const owner = await getOwnerUserFromRequest(req);
  if (!owner) return new NextResponse("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const updates: Record<string, any> = {};
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.is_paid === "boolean") updates.is_paid = body.is_paid;
  if (typeof body.payment_method === "string") updates.payment_method = body.payment_method;
  if (typeof body.reference_numb === "string") updates.reference_numb = body.reference_numb;
  if (typeof body.discount_approved === "boolean") updates.discount_approved = body.discount_approved;

  if (Object.keys(updates).length === 0) {
    return new NextResponse("No updates provided", { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/orders/:orderId/status] update error", error);
      return new NextResponse(error.message || "Failed to update order", { status: 500 });
    }

    if (!data) return new NextResponse("Order not found", { status: 404 });

    // insert activity log
    const action = updates.status || (updates.is_paid ? "paid" : updates.discount_approved ? "discount_approved" : "updated");
    const { error: logError } = await supabase.from("order_activity_logs").insert([
      {
        order_id: orderId,
        business_id: data.business_id,
        staff_id: null,
        action,
        actor_name: owner.email || owner.id,
        metadata: updates,
      },
    ]);
    if (logError) console.warn("Failed to insert order activity log (owner)", logError);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message || "Failed to update order", { status: 500 });
  }
}
