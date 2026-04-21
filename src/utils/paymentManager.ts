import { supabase } from "@/lib/supabaseClient";

export type PaymentMethod = "gcash" | "cash";

export interface PaymentRecord {
  id: string;
  order_id: string;
  session_id: string;
  business_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: "pending" | "completed" | "failed";
  transaction_id?: string;
  created_at: string;
}

/**
 * Process payment for unpaid orders in a session
 */
export async function processSessionPayment(
  sessionId: string,
  paymentMethod: PaymentMethod,
  userId?: string
) {
  // Fetch all unpaid orders in this session
  const { data: unpaidOrders, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_paid", false);

  if (fetchError) throw fetchError;
  if (!unpaidOrders || unpaidOrders.length === 0) {
    throw new Error("No unpaid orders found in this session");
  }

  const totalAmount = unpaidOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

  // Update all orders to paid
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      is_paid: true,
      status: "paid",
    })
    .eq("session_id", sessionId)
    .eq("is_paid", false);

  if (updateError) throw updateError;

  // Create payment records for each order (for tracking)
  const paymentRecords = unpaidOrders.map((order) => ({
    order_id: order.id,
    session_id: sessionId,
    business_id: order.business_id,
    amount: Number(order.total_amount),
    payment_method: paymentMethod,
    status: "completed",
  }));

  const { error: paymentError } = await supabase.from("payment_records").insert(paymentRecords);

  if (paymentError) {
    console.warn("Payment record creation failed, but order marked as paid:", paymentError);
  }

  // End the session
  const { error: sessionError } = await supabase
    .from("table_sessions")
    .update({
      active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (sessionError) console.warn("Session end update failed:", sessionError);

  return {
    totalAmount,
    ordersCount: unpaidOrders.length,
    paymentMethod,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get payment records for a session
 */
export async function getSessionPaymentRecords(sessionId: string) {
  const { data, error } = await supabase
    .from("payment_records")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return data || [];
}

/**
 * Get total paid amount for a session
 */
export async function getSessionPaidAmount(sessionId: string): Promise<number> {
  const { data, error } = await supabase
    .from("payment_records")
    .select("amount")
    .eq("session_id", sessionId)
    .eq("status", "completed");

  if (error) throw error;

  return (data || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
}

/**
 * Get unpaid amount for a session
 */
export async function getSessionUnpaidAmount(sessionId: string): Promise<number> {
  const { data, error } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("session_id", sessionId)
    .eq("is_paid", false);

  if (error) throw error;

  return (data || []).reduce((sum, order) => sum + Number(order.total_amount), 0);
}

/**
 * Check if all orders in a session are completed
 */
export async function areAllSessionOrdersCompleted(sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("session_id", sessionId)
    .neq("status", "completed");

  if (error) throw error;

  return (data || []).length === 0;
}
