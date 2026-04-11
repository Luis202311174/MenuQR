import { supabase } from "@/lib/supabaseClient";

export const handleTableSession = async (tableId: string) => {
  // 1. Get table
  const { data: table, error } = await supabase
    .from("tables")
    .select("*")
    .eq("id", tableId)
    .single();

  if (error || !table) throw new Error("Invalid table");

  // 🔥 2. Check if existing session is still ACTIVE
  if (table.current_session_id) {
    const { data: session } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("id", table.current_session_id)
      .eq("active", true)
      .single();

    if (session) {
      return session.id; // ✅ reuse only if active
    }
  }

  // 🔥 3. Create NEW session
  const { data: newSession, error: sessionError } = await supabase
    .from("table_sessions")
    .insert({
      table_id: tableId,
      active: true,
    })
    .select()
    .single();

  if (sessionError || !newSession) {
    throw new Error("Failed to create session");
  }

  // 🔥 4. Update table
  await supabase
    .from("tables")
    .update({
      current_session_id: newSession.id,
      status: "occupied",
    })
    .eq("id", tableId);

  return newSession.id;
};