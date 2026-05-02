import { supabase } from "@/lib/supabaseClient";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export const handleTableSession = async (tableId: string) => {
  const decodedTableId = decodeURIComponent(tableId || "");

  // 1. Fetch table
  const tableQuery = isUuid(decodedTableId)
    ? supabase.from("tables").select("*").eq("id", decodedTableId)
    : supabase
        .from("tables")
        .select("*")
        .or(`table_number.eq.${decodedTableId},qr_code.eq.${decodedTableId}`);

  const { data: table, error: tableError } = await tableQuery.single();

  if (tableError || !table) {
    console.warn(
      "Table session: invalid table identifier",
      decodedTableId,
      tableError?.message
    );
    return null;
  }

  // 2. If table already has a session, validate it
  if (table.current_session_id) {
    const { data: session, error: sessionError } = await supabase
      .from("table_sessions")
      .select("id, active")
      .eq("id", table.current_session_id)
      .single();

    if (sessionError || !session) {
      console.warn(
        "Table session: failed to load session",
        table.current_session_id,
        sessionError?.message
      );
      return null;
    }

    // Active session → reuse it
    if (session.active) {
      return session.id;
    }

    // Inactive session → block access
    console.log("Table session is inactive. Blocking access.");
    return null;
  }

  // 3. Optional cooldown after last session ended
  if (table.last_session_ended_at) {
    const endedAt = new Date(table.last_session_ended_at).getTime();
    const now = Date.now();

    const COOLDOWN_MS = 2000;
    if (now - endedAt < COOLDOWN_MS) {
      return null;
    }
  }

  // 4. Create new session
  const { data: newSession, error: createError } = await supabase
    .from("table_sessions")
    .insert({
      table_id: table.id,
      active: true,
    })
    .select("id")
    .single();

  if (createError || !newSession) {
    console.error("Failed to create table session", createError);
    return null;
  }

  // 5. Attach session to table
  const { error: updateError } = await supabase
    .from("tables")
    .update({
      current_session_id: newSession.id,
      status: "occupied",
    })
    .eq("id", table.id);

  if (updateError) {
    console.error(
      "Failed to update table with session",
      updateError.message
    );
  }

  return newSession.id;
};