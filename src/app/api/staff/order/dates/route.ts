import { NextRequest, NextResponse } from "next/server";
import { getStaffSessionFromRequest, getOwnerUserFromRequest, createServerSupabaseAdminClient } from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  if (!staffId) return NextResponse.json([], { status: 200 });

  const owner = await getOwnerUserFromRequest(req);
  const staffSession = await getStaffSessionFromRequest(req);
  if (!owner && !staffSession) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseAdminClient();

  try {
    // Count distinct orders per day for activity involving this staff
    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("created_at, order_id", { count: "exact" })
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/staff/order/dates] error", error);
      return new NextResponse(error.message || "Failed to load order dates", { status: 500 });
    }

    // Group by localized date string (server side use ISO date)
    const groups: Record<string, Set<string>> = {};
    (data || []).forEach((row: any) => {
      const dt = new Date(row.created_at);
      if (Number.isNaN(dt.getTime())) return;
      const key = dt.toISOString().slice(0, 10); // YYYY-MM-DD
      groups[key] = groups[key] || new Set();
      if (row.order_id) groups[key].add(row.order_id);
    });

    const result = Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((k) => ({ date: k, count: groups[k].size }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message || "Failed to load order dates", { status: 500 });
  }
}
