import { supabase } from "@/lib/supabaseClient";

export const endTableSession = async (sessionId: string, tableId: string) => {
  // 1. End session
  await supabase
    .from("table_sessions")
    .update({
      active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  // 2. Free table
  await supabase
    .from("tables")
    .update({
      current_session_id: null,
      status: "available",
    })
    .eq("id", tableId);
};