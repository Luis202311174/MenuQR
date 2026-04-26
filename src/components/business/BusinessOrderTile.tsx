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
  payment_method?: string | null;
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
  setMarkPaidModal: (v: any) => void;
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
  setMarkPaidModal,
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
      "pending_payment",
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

  const actions = useMemo<Record<string, any[]>>(() => ({
    pending: [
      {
        label: "Accept Order",
        className: "bg-blue-600",
        action: () => updateOrderStatus(order.id, "received"),
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
    pending_payment: [
      {
        label: "Mark Paid",
        className: "bg-green-600",
        action: () =>
          setMarkPaidModal({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
            paymentMethod: order.payment_method === "gcash" ? "gcash" : "cash",
          }),
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
    received: [
      ...(!order.is_paid
        ? [
            {
              label: "Mark Paid",
              className: "bg-green-600",
              action: () =>
                setMarkPaidModal({
                  orderId: order.id,
                  orderNumber: order.id.slice(0, 8),
                  paymentMethod: order.payment_method === "gcash" ? "gcash" : "cash",
                }),
            },
          ]
        : []),
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
    preparing: [
      {
        label: "Ready",
        className: "bg-purple-600",
        action: () => updateOrderStatus(order.id, "ready"),
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
    ready: [
      {
        label: "Served",
        className: "bg-teal-600",
        action: () => updateOrderStatus(order.id, "served"),
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
    served: [
      {
        label: "Complete",
        className: "bg-green-700",
        action: () => completeOrder(order),
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
  }), [order, markAsPaid, setMarkPaidModal, setCancelOrderModal, updateOrderStatus, completeOrder]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}
      <div className="bg-slate-50 px-4 py-4">
        <div className="flex justify-between">
          <div>

            <div className="flex gap-2 flex-wrap">
              {/* ORDER STATUS */}
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(
                  status as any,
                  order.is_paid // Use actual payment status for coloring
                )}`}
              >
                {displayStatusLabel(status)}
              </span>

              {/* PAYMENT STATUS */}
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  order.is_paid
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                }`}
              >
                {order.is_paid ? "Paid" : "Unpaid"}
              </span>

              {/* PAYMENT METHOD */}
              {order.payment_method && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    order.payment_method === "gcash"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {order.payment_method === "gcash" ? "GCash" : "Cash"}
                </span>
              )}
            </div>

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

      {/* ITEMS - WITH FOODPANDA STYLE OPTIONS */}
      <div className="p-4 space-y-3">
        {order.items?.map((item: any, i: number) => {
          // Calculate item total with options
          const itemAddonsTotal =
            item.selected_options?.reduce(
              (sum: number, opt: any) => sum + (opt.price_modifier || 0),
              0
            ) || 0;
          
          const itemBasePrice = item.base_price || item.price || 0;
          const itemFinalPrice = itemBasePrice + itemAddonsTotal;
          const itemQty = item.quantity || item.qty || 1;
          const itemTotal = itemFinalPrice * itemQty;

          return (
            <div key={i} className="border-b border-slate-100 pb-3 last:border-b-0">
              {/* Item Name & Quantity */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    ₱{itemBasePrice.toFixed(2)}
                  </p>
                </div>
                <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                  x{itemQty}
                </span>
              </div>

              {/* Selected Options */}
              {item.selected_options && item.selected_options.length > 0 && (
                <div className="ml-3 space-y-1 mb-2">
                  {item.selected_options.map((opt: any, optIdx: number) => (
                    <div
                      key={optIdx}
                      className="flex justify-between text-xs text-slate-600"
                    >
                      <span>
                        {opt.group_name}: <span className="text-slate-700 font-medium">{opt.option_name}</span>
                      </span>
                      {opt.price_modifier > 0 && (
                        <span className="text-slate-700 font-medium">
                          +₱{opt.price_modifier.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Item Total */}
              <div className="flex justify-end text-sm font-semibold text-slate-900">
                ₱{itemTotal.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTIONS (NO IF STATEMENTS) */}
      <div className="p-4 flex flex-wrap gap-2">
        {(actions[status as keyof typeof actions] ?? []).map((btn, idx) => (
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