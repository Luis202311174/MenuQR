import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/serverSupabase";
import { hashPassword, createSessionToken, hashSessionToken, verifyPassword } from "@/lib/staffAuth";
import { isValidStaffStatus } from "@/lib/staffPermissions";

export async function POST(req: Request) {
  const body = await req.json();
  const email = (body.email || "").toString().trim().toLowerCase();
  const password = (body.password || "").toString();
  const rememberMe = Boolean(body.rememberMe);

  if (!email || !password) {
    return new NextResponse("Email and password are required", { status: 400 });
  }

  let supabase;
  try {
    supabase = createServerSupabaseAdminClient();
  } catch (error) {
    return new NextResponse(
      "Server misconfiguration",
      { status: 500 }
    );
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_accounts")
    .select("id, full_name, email, password_hash, role, status, business_id")
    .eq("email", email)
    .single();

  if (staffError || !staff) {
    return new NextResponse("Invalid credentials", { status: 401 });
  }

  if (!isValidStaffStatus(staff.status)) {
    return new NextResponse("This account is disabled", { status: 403 });
  }

  if (!verifyPassword(password, staff.password_hash)) {
    return new NextResponse("Invalid credentials", { status: 401 });
  }

  const token = createSessionToken();
  const sessionHash = hashSessionToken(token);
  const now = new Date();
  const expiration = new Date(now.getTime() + (rememberMe ? 30 : 8) * 60 * 60 * 1000);

  const { error: sessionError } = await supabase.from("staff_sessions").insert({
    staff_id: staff.id,
    business_id: staff.business_id,
    token_hash: sessionHash,
    created_at: now.toISOString(),
    expires_at: expiration.toISOString(),
    is_active: true,
  });

  if (sessionError) {
    return new NextResponse("Unable to create session", { status: 500 });
  }

  await supabase
    .from("staff_accounts")
    .update({ last_login_at: now.toISOString() })
    .eq("id", staff.id);

  const response = NextResponse.json({
    redirect: "/business/dashboard",
  });

  response.cookies.set({
    name: "staff_session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
  });

  return response;
}
