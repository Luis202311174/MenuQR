import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getOwnerUserFromRequest } from "@/lib/serverSupabase";

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

    const { data, error } = await supabase
      .from("order_activity_logs")
      .select("id, order_id, business_id, owner_id, action, metadata, created_at")
      .eq("business_id", business.id)
      .eq("owner_id", owner.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load owner logs" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}