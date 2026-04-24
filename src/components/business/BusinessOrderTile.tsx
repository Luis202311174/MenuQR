"use client";

import React, { useMemo, useEffect } from "react";
import { getStatusColor, OrderStatus } from "@/utils/orderStatusManager";

type Order = {
  id: string;
  status: OrderStatus | string;
  created_at: string;
  total_amount: number;
  items: any[];
  table_id?: string | null;
  session_id?: string | null;
  is_paid?: boolean;
  table?: {
    id: string;
    table_number: string;
  } | null;
};

interface Props {
  order: Order;
  displayStatusLabel: (status: string, isPaid?: boolean) => string;
  getStatusBgColor: (status: OrderStatus, isPaid?: boolean) => string;

  processingOrderId: string | null;
  completingOrderId: string | null;

  updateOrderStatus: (id: string, status: OrderStatus) => void;
  markAsPaid: (id: string) => void;
  setPaymentStatusModal: (v: any) => void;
  setCancelOrderModal: (v: any) => void;
  completeOrder: (order: Order) => void;
}

const BusinessOrderTile: React.FC<Props> = ({
  order,
  displayStatusLabel,
  getStatusBgColor,
  completingOrderId,
  updateOrderStatus,
  markAsPaid,
  setPaymentStatusModal,
  setCancelOrderModal,
  completeOrder,
}) => {
  /**
   * Normalize status to avoid UI mismatch bugs
   */
  const status = useMemo((): OrderStatus => {
    const raw = (order.status || "")
      .toString()
      .toLowerCase()
      .trim();

    const valid: OrderStatus[] = [
      "pending",
      "received",
      "paid",
      "preparing",
      "ready",
      "served",
      "completed",
      "cancelled",
    ];

    if (valid.includes(raw as OrderStatus)) {
      return raw as OrderStatus;
    }

    return "received";
  }, [order.status]);

  useEffect(() => {
    console.log("RAW STATUS:", order.status);
    console.log("NORMALIZED STATUS:", status);
    console.log("ACTIONS:", ACTIONS[status]);
  }, [order.status, status]);

  /**
   * Action system (NO IF STATEMENTS)
   */
  const ACTIONS: Partial<Record<OrderStatus, any[]>> = {
    pending: [
      {
        label: "Accept Order",
        className: "bg-blue-600",
        action: () => updateOrderStatus(order.id, "received"),
      },
      {
        label: "Reject",
        className: "bg-red-700",
        action: () =>
          setCancelOrderModal({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
          }),
      },
    ],

    received: [
      {
        label: "Mark Paid",
        className: "bg-green-600",
        action: () => markAsPaid(order.id),
      },
      {
        label: "Prepare",
        className: "bg-yellow-500",
        action: () => updateOrderStatus(order.id, "preparing"),
      },
      {
        label: "Cancel",
        className: "bg-red-700",
        action: () =>
          setCancelOrderModal({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
          }),
      },
    ],

    paid: [
      {
        label: "Prepare",
        className: "bg-yellow-500",
        action: () => updateOrderStatus(order.id, "preparing"),
      },
    ],

    preparing: [
      {
        label: "Ready",
        className: "bg-purple-600",
        action: () => updateOrderStatus(order.id, "ready"),
      },
    ],

    ready: [
      {
        label: "Served",
        className: "bg-teal-600",
        action: () => updateOrderStatus(order.id, "served"),
      },
    ],

    served: [
      {
        label: "Complete",
        className: "bg-green-700",
        action: () => completeOrder(order),
      },
    ],
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}
      <div className="bg-slate-50 px-4 py-4">
        <div className="flex justify-between">
          <div>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(
                status as any,
                order.is_paid
              )}`}
            >
              {displayStatusLabel(status, order.is_paid)}
            </span>

            <div className="mt-2 text-xs text-slate-500">
              <p>{new Date(order.created_at).toLocaleString()}</p>
              <p>Table: {order.table?.table_number || "N/A"}</p>
            </div>
          </div>

          <div className="font-bold text-[#9B1C1C]">
            ₱{Number(order.total_amount).toFixed(2)}
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="p-4 space-y-2">
        {order.items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-slate-500">₱{item.price}</p>
            </div>

            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
              {item.quantity || 1}
            </span>
          </div>
        ))}
      </div>

      {/* ACTIONS (NO IF STATEMENTS) */}
      <div className="p-4 flex flex-wrap gap-2">
        {(ACTIONS[status] || []).map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.action}
            disabled={btn.disabled}
            className={`${btn.className} text-white px-3 py-2 rounded-full text-xs disabled:opacity-50`}
          >
            {btn.label}
          </button>
        ))}
      </div>

    </div>
  );
};

export default BusinessOrderTile;