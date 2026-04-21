import { supabase } from "@/lib/supabaseClient";

export type OrderStatus = "received" | "paid" | "preparing" | "ready" | "served" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";

/**
 * Order Status Flow:
 * UNPAID: received -> preparing -> ready -> served -> completed
 * PAID: paid -> preparing -> ready -> served -> completed
 * CANCELLED: Any status -> cancelled (void order)
 */

export interface OrderStatusTransition {
  orderId: string;
  newStatus: OrderStatus;
}

/**
 * Confirm order received - Business acknowledges receipt (order stays unpaid)
 */
export async function confirmOrderReceived(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "received" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirm order paid - Business acknowledges payment received
 */
export async function confirmOrderPaid(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "paid", is_paid: true })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark order as preparing
 */
export async function markOrderPreparing(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "preparing" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark order as ready
 */
export async function markOrderReady(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "ready" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark order as served
 */
export async function markOrderServed(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "served" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark order as completed
 */
export async function markOrderCompleted(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get display label for order status
 */
export function getOrderStatusLabel(status: OrderStatus, isPaid?: boolean): string {
  switch (status) {
    case "received":
      return isPaid ? "Paid - Preparing" : "Received - Unpaid";
    case "paid":
      return "Paid - Preparing";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready to Serve";
    case "served":
      return "Order Served";
    case "completed":
      return "Completed";
    case "cancelled":
      return "❌ Cancelled";
    default:
      return status;
  }
}

/**
 * Get next valid status transitions
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    received: ["preparing", "paid", "cancelled"],
    paid: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["served", "cancelled"],
    served: ["completed"],
    completed: [],
    cancelled: [],
  };
  return transitions[currentStatus] || [];
}

/**
 * Check if order can transition to a new status
 */
export function canTransitionTo(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  return getNextStatuses(currentStatus).includes(newStatus);
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: OrderStatus, isPaid?: boolean): string {
  switch (status) {
    case "received":
      return isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-green-100 text-green-800";
    case "preparing":
      return "bg-blue-100 text-blue-800";
    case "ready":
      return "bg-purple-100 text-purple-800";
    case "served":
      return "bg-indigo-100 text-indigo-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
