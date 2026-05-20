import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/serverSupabase";

export async function POST(req: Request) {
  const body = await req.json();
  const email = (body.email || "").toString().trim().toLowerCase();

  if (!email) {
    return new NextResponse("Email is required", { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: staff, error } = await supabase
    .from("staff_accounts")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !staff) {
    return new NextResponse("If an account exists, a reset link has been sent", { status: 200 });
  }

  return NextResponse.json({ message: "If an account exists, a reset link has been sent" });
}
