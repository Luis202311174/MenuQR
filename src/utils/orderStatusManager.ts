import { supabase } from "@/lib/supabaseClient";

export type OrderStatus =
  | "pending"  
  | "pending_payment"
  | "received"
  | "paid"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid";


export interface OrderStatusTransition {
  orderId: string;
  newStatus: OrderStatus;
}

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

export async function confirmOrderPaid(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ is_paid: true })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

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

export function getOrderStatusLabel(status: OrderStatus, isPaid?: boolean): string {
  switch (status) {
    case "pending":
      return "Pending Confirmation";
    case "pending_payment":
      return "Awaiting Payment";
    case "paid":
      return "Payment Received";
    case "received":
      return "Received";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready to Serve";
    case "served":
      return "Served";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ["received", "cancelled"],
    pending_payment: ["paid", "cancelled"],
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

export function canTransitionTo(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  return getNextStatuses(currentStatus).includes(newStatus);
}

export function getStatusColor(status: OrderStatus, isPaid?: boolean): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "pending_payment":
      return "bg-orange-100 text-orange-800";
    case "received":
      return isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-green-100 text-green-800";
    case "preparing":
      return "bg-indigo-100 text-indigo-800";
    case "ready":
      return "bg-purple-100 text-purple-800";
    case "served":
      return "bg-teal-100 text-teal-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}