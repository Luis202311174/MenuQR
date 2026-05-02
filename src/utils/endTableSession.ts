import { supabase } from "@/lib/supabaseClient";

export const endTableSession = async (sessionId: string, tableId: string) => {
  // Mark session as ended
  await supabase
    .from("table_sessions")
    .update({
      active: false,  // Only false when user completes order
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  // Release table
  await supabase
    .from("tables")
    .update({
      current_session_id: null,
      status: "available",
      last_session_ended_at: new Date().toISOString(),
    })
    .eq("id", tableId);
};