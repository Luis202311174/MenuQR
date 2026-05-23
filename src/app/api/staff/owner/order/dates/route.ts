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

    // Count distinct orders per day for activity involving the business
    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("created_at, order_id")
      .eq("business_id", business.id);


    if (error) {
      console.error("[GET /api/staff/owner/order/dates] error", error);
      return NextResponse.json(
        { error: error.message || "Failed to load order dates" },
        { status: 500 }
      );
    }

    // Only keep logs for this business
    const filtered = (data || []).filter((row: any) => row?.order_id);

    // Group by YYYY-MM-DD (UTC)
    const groups: Record<string, Set<string>> = {};
    for (const row of filtered) {
      if (!row?.created_at) continue;
      const dt = new Date(row.created_at);
      if (Number.isNaN(dt.getTime())) continue;
      const key = dt.toISOString().slice(0, 10);
      groups[key] = groups[key] || new Set();
      groups[key].add(String(row.order_id));
    }

    const result = Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((k) => ({ date: k, count: groups[k].size }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

