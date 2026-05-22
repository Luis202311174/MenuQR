import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getOwnerUserFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest, context: any) {
  const orderId = context?.params?.orderId || req.nextUrl.pathname.split("/").filter(Boolean).slice(-3, -2)[0];
  if (!orderId) return new NextResponse("Order ID required", { status: 400 });

  const owner = await getOwnerUserFromRequest(req);
  if (!owner) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "paid", is_paid: true })
      .eq("id", orderId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/orders/:orderId/mark-paid] update error", error);
      return new NextResponse(error.message || "Failed to mark paid", { status: 500 });
    }

    if (!data) return new NextResponse("Order not found", { status: 404 });

    // insert activity log
    const { error: logError } = await supabase.from("order_activity_logs").insert([
      {
        order_id: orderId,
        business_id: data.business_id,
        staff_id: null,
        action: "paid",
        actor_name: owner.email || owner.id,
      },
    ]);
    if (logError) console.warn("Failed to insert order activity log (owner)", logError);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message || "Failed to mark paid", { status: 500 });
  }
}
