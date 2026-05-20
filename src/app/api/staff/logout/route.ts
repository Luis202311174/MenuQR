import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/serverSupabase";
import { hashSessionToken } from "@/lib/staffAuth";

export async function POST(req: Request) {
  const token = req.cookies.get("staff_session")?.value;

  if (token) {
    const sessionHash = hashSessionToken(token);
    const supabase = createServerSupabaseClient();
    await supabase
      .from("staff_sessions")
      .update({ is_active: false })
      .eq("token_hash", sessionHash);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "staff_session",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
