import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/serverSupabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || slug.length > 100) {
    return NextResponse.json({ error: "Invalid business slug." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("*,business_socials(id,fb,fp,ig,gr)")
    .eq("slug", slug)
    .limit(1);

  if (businessError) {
    console.error("Failed to load public business:", businessError.message);
    return NextResponse.json({ error: "Unable to load this menu." }, { status: 500 });
  }

  const business = businesses?.[0];
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("*")
    .eq("business_id", business.id)
    .eq("availability", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (menuError) {
    console.error("Failed to load public menu items:", menuError.message);
    return NextResponse.json({ error: "Unable to load this menu." }, { status: 500 });
  }

  return NextResponse.json({
    business,
    menuItems: menuItems ?? [],
    sessionId: null,
    tableInvalid: false,
  });
}
