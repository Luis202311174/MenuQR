import { supabase } from "@/lib/supabaseClient";

export type CreateOrderParams = {
  businessId: string;
  cartItems: any[];
  totalAmount: number;
  tableId: string;
  sessionId: string;
  userId?: string;
};

export async function createOrder({
  businessId,
  cartItems,
  totalAmount,
  tableId,
  sessionId,
  userId,
}: CreateOrderParams) {
  const { data: latestItems, error: checkError } = await supabase
    .from("menu_items")
    .select("id,availability")
    .in("id", cartItems.map((item) => item.id));

  if (checkError) throw checkError;

  const unavailableItems = (latestItems || []).filter((item) => item.availability !== true);
  if (unavailableItems.length > 0) {
    throw new Error("Some items are no longer available");
  }

  const orderData: any = {
    business_id: businessId,
    items: cartItems,
    total_amount: totalAmount,
    status: "pending",
    table_id: tableId,
    session_id: sessionId,
    ...(userId ? { user_id: userId } : {}),
  };

  const { data, error } = await supabase.from("orders").insert(orderData).select("*").single();
  if (error) throw error;

  return data;
}