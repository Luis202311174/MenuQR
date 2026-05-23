import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getOwnerUserFromRequest,
} from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  try {
    const owner = await getOwnerUserFromRequest(req);
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateParam = req.nextUrl.searchParams.get("date");
    if (!dateParam) return NextResponse.json([], { status: 200 });

    const supabase = createServerSupabaseAdminClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", owner.id)
      .limit(1)
      .maybeSingle();

    if (businessError) {
      return NextResponse.json(
        { error: businessError.message || "Failed to load business" },
        { status: 500 }
      );
    }

    if (!business?.id) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const businessId = business.id;

    // Parse dateParam (expecting YYYY-MM-DD)
    const dayStart = new Date(dateParam);
    if (Number.isNaN(dayStart.getTime())) {
      // try YYYY-MM-DD manual
      const parts = dateParam.split("-");
      if (parts.length !== 3) {
        return NextResponse.json([], { status: 200 });
      }
      const iso = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      dayStart.setTime(new Date(iso).getTime());
    }

    const startIso = new Date(new Date(dayStart).setUTCHours(0, 0, 0, 0)).toISOString();
    const endIso = new Date(new Date(dayStart).setUTCHours(23, 59, 59, 999)).toISOString();

    // Get distinct order IDs for that business and day
    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("order_id")
      .eq("business_id", businessId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (error) {
      console.error("[GET /api/staff/owner/orders] error", error);
      return NextResponse.json(
        { error: error.message || "Failed to load orders for date" },
        { status: 500 }
      );
    }

    const orderIds = Array.from(new Set((data || []).map((r: any) => r?.order_id).filter(Boolean)));
    if (orderIds.length === 0) return NextResponse.json([], { status: 200 });

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at, customer_name, total_amount")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[GET /api/staff/owner/orders] orders fetch error", ordersError);
      return NextResponse.json(
        { error: ordersError.message || "Failed to fetch orders" },
        { status: 500 }
      );
    }

    return NextResponse.json(ordersData || []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

