import { supabase } from "@/lib/supabaseClient";

export type OrderData = {
  id: string;
  business_id: string;
  user_id?: string;
  items: any[];
  total_amount: number;
  status: "pending" | "received" | "ready" | "completed" | "paid" | "served" | "cancelled" | "none";
  table_id?: string | null;
  session_id?: string | null;
  is_paid?: boolean;
  created_at: string;
  updated_at?: string;
};

export async function fetchActiveOrderByTable(tableId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("table_id", tableId)
    .in("status", ["pending", "received", "ready", "paid", "served"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading active order:", error);
    return null;
  }

  return data;
}

// New function to fetch all unpaid orders for a session
export async function fetchUnpaidOrdersBySession(sessionId: string) {
  if (!sessionId) {
    console.warn("fetchUnpaidOrdersBySession: sessionId is missing");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_paid", false)
      .in("status", ["received", "ready", "served"]) // Unpaid orders that are being prepared, ready, or served
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading unpaid orders:", error.message || error);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.error("Exception in fetchUnpaidOrdersBySession:", err?.message || err);
    return [];
  }
}

// New function to fetch all orders for a session (both paid and unpaid)
export async function fetchAllOrdersBySession(sessionId: string) {
  if (!sessionId) {
    console.warn("fetchAllOrdersBySession: sessionId is missing");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("session_id", sessionId)
      .in("status", ["received", "ready", "paid", "completed", "served"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading session orders:", error.message || error);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.error("Exception in fetchAllOrdersBySession:", err?.message || err);
    return [];
  }
}