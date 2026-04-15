import { supabase } from "@/lib/supabaseClient";

export type OrderData = {
  id: string;
  business_id: string;
  user_id?: string;
  items: any[];
  total_amount: number;
  status: "pending" | "received" | "ready" | "completed" | "none";
  table_id?: string | null;
  session_id?: string | null;
  created_at: string;
  updated_at?: string;
};

export async function fetchActiveOrderByTable(tableId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("table_id", tableId)
    .in("status", ["pending", "received", "ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading active order:", error);
    return null;
  }

  return data;
}