import { supabase } from "@/lib/supabaseClient";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export const handleTableSession = async (tableId: string) => {
  const decodedTableId = decodeURIComponent(tableId || "");

  const tableQuery = isUuid(decodedTableId)
    ? supabase.from("tables").select("*").eq("id", decodedTableId)
    : supabase
        .from("tables")
        .select("*")
        .or(`table_number.eq.${decodedTableId},qr_code.eq.${decodedTableId}`);

  const { data: table, error } = await tableQuery.single();

  if (error || !table) {
    console.warn("Table session: invalid table identifier", tableId, error?.message);
    return null;
  }

  if (table.current_session_id) {
    const { data: session } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("id", table.current_session_id)
      .eq("active", true)
      .single();

    if (session) {
      return session.id;
    }
  }

  const { data: newSession, error: sessionError } = await supabase
    .from("table_sessions")
    .insert({
      table_id: table.id,
      active: true,
    })
    .select()
    .single();

  if (sessionError || !newSession) {
    console.error("Failed to create table session", sessionError);
    return null;
  }

  const { error: updateError } = await supabase
    .from("tables")
    .update({
      current_session_id: newSession.id,
      status: "occupied",
    })
    .eq("id", table.id);

  if (updateError) {
    console.error("Failed to update table after creating session", updateError);
  }

  return newSession.id;
};