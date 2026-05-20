import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
} from "@/lib/serverSupabase";
import { hashSessionToken } from "@/lib/staffAuth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("staff_session")?.value;

    if (token) {
      const sessionHash = hashSessionToken(token);

      const supabase = createServerSupabaseClient();

      await supabase
        .from("staff_sessions")
        .update({ is_active: false })
        .eq("token_hash", sessionHash);
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: "staff_session",
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/staff/logout]", error);

    return NextResponse.json(
      {
        error: "Logout failed",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}