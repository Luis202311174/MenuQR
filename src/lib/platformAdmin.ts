import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
} from "@/lib/serverSupabase";

export type PlatformAdminAuth =
  | { ok: true; user: User; supabase: ReturnType<typeof createServerSupabaseAdminClient> }
  | { ok: false; response: NextResponse };

export async function requirePlatformAdmin(req: NextRequest): Promise<PlatformAdminAuth> {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const authClient = createServerSupabaseClient(token);
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Your session is invalid or expired." }, { status: 401 }),
    };
  }

  const supabase = createServerSupabaseAdminClient();
  const { data: grant, error: grantError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (grantError) {
    console.error("[platform admin] Failed to verify admin grant", grantError);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unable to verify platform-admin access." }, { status: 500 }),
    };
  }

  if (!grant) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Platform-admin access is required." }, { status: 403 }),
    };
  }

  return { ok: true, user: authData.user, supabase };
}
