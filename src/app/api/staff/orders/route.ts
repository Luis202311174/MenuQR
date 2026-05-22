import { NextRequest, NextResponse } from "next/server";
import { getStaffSessionFromRequest, getOwnerUserFromRequest, createServerSupabaseAdminClient } from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const dateParam = req.nextUrl.searchParams.get("date");

  if (!staffId || !dateParam) return NextResponse.json([], { status: 200 });

  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);
  if (!owner && !staffSession) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseAdminClient();

  try {
    // Parse dateParam (expecting YYYY-MM-DD or ISO). Accept common formats.
    const dayStart = new Date(dateParam);
    if (Number.isNaN(dayStart.getTime())) {
      // try parsing as YYYY-MM-DD
      const parts = dateParam.split("-");
      if (parts.length === 3) {
        const iso = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        dayStart.setTime(new Date(iso).getTime());
      }
    }
    const startIso = new Date(new Date(dayStart).setUTCHours(0, 0, 0, 0)).toISOString();
    const endIso = new Date(new Date(dayStart).setUTCHours(23, 59, 59, 999)).toISOString();

    // Get distinct order IDs for that staff and date
    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("order_id, created_at, action, actor_name, staff_id, metadata")
      .eq("staff_id", staffId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/staff/orders] error", error);
      return new NextResponse(error.message || "Failed to load orders for date", { status: 500 });
    }

    // Map to unique orders and fetch some info from orders table
    const orderIds = Array.from(new Set((data || []).map((r: any) => r.order_id))).filter(Boolean);
    if (orderIds.length === 0) return NextResponse.json([], { status: 200 });

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[GET /api/staff/orders] orders fetch error", ordersError);
      return new NextResponse(ordersError.message || "Failed to fetch orders", { status: 500 });
    }

    // Join activity summary with order info
    const orders = (ordersData || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
    }));

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message || "Failed to load orders for date", { status: 500 });
  }
}
