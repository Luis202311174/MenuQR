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

/* =========================================================
   ORDER STATUS UPDATE
   Frontend ONLY calls the RPC
========================================================= */

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  staffId: string
) {
  const { data, error } = await supabase.rpc(
    "update_order_status_with_staff_id",
    {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_staff_id: staffId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   STATUS ACTIONS
========================================================= */

export async function confirmOrderReceived(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "received",
    staffId
  );
}

export async function confirmOrderPaid(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "paid",
    staffId
  );
}

export async function markOrderPreparing(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "preparing",
    staffId
  );
}

export async function markOrderReady(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "ready",
    staffId
  );
}

export async function markOrderServed(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "served",
    staffId
  );
}

export async function markOrderCompleted(
  orderId: string,
  staffId: string
) {
  return updateOrderStatus(
    orderId,
    "completed",
    staffId
  );
}

/* =========================================================
   STATUS LABELS
========================================================= */

export function getOrderStatusLabel(
  status: OrderStatus,
  isPaid?: boolean
): string {
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

/* =========================================================
   STATUS TRANSITIONS
========================================================= */

export function getNextStatuses(
  currentStatus: OrderStatus
): OrderStatus[] {
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

export function canTransitionTo(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return getNextStatuses(currentStatus).includes(newStatus);
}

/* =========================================================
   STATUS COLORS
========================================================= */

export function getStatusColor(
  status: OrderStatus,
  isPaid?: boolean
): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";

    case "pending_payment":
      return "bg-orange-100 text-orange-800";

    case "received":
      return isPaid
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-800";

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