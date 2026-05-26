import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const rawGetSession = supabase.auth.getSession.bind(supabase.auth) as typeof supabase.auth.getSession;

supabase.auth.getSession = async (...args) => {
  try {
    return await rawGetSession(...args);
  } catch (error) {
    console.warn("Supabase auth.getSession failed:", error);
    return { data: { session: null }, error } as Awaited<ReturnType<typeof rawGetSession>>;
  }
}
