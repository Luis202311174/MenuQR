"use client";

import React, { useMemo, useState } from "react";
import { getStatusColor, OrderStatus } from "@/utils/orderStatusManager";
import ReceiptPrintModal from "@/components/ReceiptPrintModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faReceipt, faXmark } from "@fortawesome/free-solid-svg-icons";

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
  e_receipt_url?: string | null;
  table?: {
    id: string;
    table_number: string;
  } | null;
  total_guests?: number;
  senior_pwd_count?: number;
  coupon_id?: string | null;
  discount_amount?: number;
  discount_approved?: boolean;
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
  businessName: string;
  businessAddress: string;
  verifyDiscount: (orderId: string, orderNumber: string) => void;
  readOnly?: boolean; 
}

const BusinessOrderTile: React.FC<Props> = ({
  order,
  displayStatusLabel,
  getStatusBgColor,
  processingOrderId, // Make sure this is captured to determine 'isProcessing'
  completingOrderId,
  updateOrderStatus,
  markAsPaid,
  setPaymentStatusModal,
  setCancelOrderModal,
  completeOrder,
  setMarkPaidModal,
  verifyDiscount,
  businessName = "Restaurant",
  businessAddress,
  readOnly = false, // 👈 1. Destructure readOnly with a default value
}) => {
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [paymentProofModalOpen, setPaymentProofModalOpen] = useState(false);

  // Quick helper variables to match your snippet's shorthand references
  const id = order.id;
  const orderNumber = order.id.slice(0, 8);
  const isProcessing = processingOrderId === order.id || completingOrderId === order.id;

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

  const hasDiscountPendingApproval = (order.discount_amount || 0) > 0 && !order.discount_approved;
  const orderDiscountLabel = order.coupon_id ? "Coupon Discount" : order.senior_pwd_count ? "Senior/PWD Discount" : "Discount";
  const paymentMethod = order.payment_method?.trim().toLowerCase();
  const hasOnlinePaymentProof = Boolean(
    order.e_receipt_url && paymentMethod && !["cash", "cod"].includes(paymentMethod),
  );
  const paymentMethodLabel = order.payment_method?.trim() || "Online payment";

  // 👈 2. Updated Memoized Actions with readOnly, isProcessing, and hover styles applied
  const actions = useMemo<Record<string, any[]>>(() => ({
    pending: [
      {
        label: "Accept Order",
        className: "bg-blue-600 hover:bg-blue-700",
        action: () => updateOrderStatus(id, "received" as OrderStatus),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ],
    pending_payment: [
      ...(!hasDiscountPendingApproval
        ? [
            {
              label: "Mark Paid",
              className: "bg-emerald-600 hover:bg-emerald-700",
              action: () =>
                setMarkPaidModal({
                  orderId: id,
                  orderNumber,
                  paymentMethod: order.payment_method === "gcash" ? "gcash" : "cash",
                }),
              disabled: isProcessing || readOnly,
            },
          ]
        : []),
      hasDiscountPendingApproval && {
        label: "Verify Discount",
        className: "bg-amber-600 hover:bg-amber-700",
        action: () => verifyDiscount(id, orderNumber),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ].filter(Boolean),
    received: order.is_paid
      ? [
          {
            label: "Start Preparing",
            className: "bg-amber-600 hover:bg-amber-700",
            action: () => updateOrderStatus(id, "preparing" as OrderStatus),
            disabled: isProcessing || readOnly,
          },
        ]
      : [
          ...(!hasDiscountPendingApproval
            ? [
                {
                  label: "Mark as Paid",
                  className: "bg-emerald-600 hover:bg-emerald-700",
                  action: () =>
                    setMarkPaidModal({
                      orderId: id,
                      orderNumber,
                      paymentMethod: order.payment_method || "cash",
                    }),
                  disabled: isProcessing || readOnly,
                },
              ]
            : []),
          hasDiscountPendingApproval && {
            label: "Verify Discount",
            className: "bg-amber-600 hover:bg-amber-700",
            action: () => verifyDiscount(id, orderNumber),
            disabled: isProcessing || readOnly,
          },
          {
            label: "Start Preparing (Unpaid)",
            className: "bg-amber-600 hover:bg-amber-700",
            action: () => updateOrderStatus(id, "preparing" as OrderStatus),
            disabled: isProcessing || readOnly,
          },
          {
            label: "Cancel",
            className: "bg-rose-600 hover:bg-rose-700",
            action: () => setCancelOrderModal({ orderId: id, orderNumber }),
            disabled: isProcessing || readOnly,
          },
        ].filter(Boolean),
    paid: [
      {
        label: "Start Preparing",
        className: "bg-amber-600 hover:bg-amber-700",
        action: () => updateOrderStatus(id, "preparing" as OrderStatus),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ],
    preparing: [
      {
        label: "Mark as Ready",
        className: "bg-indigo-600 hover:bg-indigo-700",
        action: () => updateOrderStatus(id, "ready" as OrderStatus),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ],
    ready: [
      {
        label: "Mark as Served",
        className: "bg-teal-600 hover:bg-teal-700",
        action: () => updateOrderStatus(id, "served" as OrderStatus),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ],
    served: [
      {
        label: "Print Receipt",
        className: "bg-purple-600 hover:bg-purple-700",
        action: () => setReceiptModalOpen(true),
        // Keeping print button enabled during read-only mode typically makes sense, 
        // but feel free to add "|| readOnly" here if you want printing disabled too!
        disabled: isProcessing, 
      },
      {
        label: "Complete Order & Session",
        className: "bg-slate-900 hover:bg-black",
        action: () => completeOrder(order),
        disabled: isProcessing || readOnly,
      },
      {
        label: "Cancel",
        className: "bg-rose-600 hover:bg-rose-700",
        action: () => setCancelOrderModal({ orderId: id, orderNumber }),
        disabled: isProcessing || readOnly,
      },
    ],
  }), [order, id, orderNumber, isProcessing, readOnly, setMarkPaidModal, setCancelOrderModal, updateOrderStatus, completeOrder, verifyDiscount]);

  return (
    <>
      <ReceiptPrintModal
        isOpen={receiptModalOpen}
        order={order}
        businessName={businessName}
        businessAddress={businessAddress}
        onClose={() => setReceiptModalOpen(false)}
      />

      {paymentProofModalOpen && order.e_receipt_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`payment-proof-title-${order.id}`}
          onMouseDown={() => setPaymentProofModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Payment verification</p>
                <h2 id={`payment-proof-title-${order.id}`} className="mt-1 text-lg font-bold text-slate-900">
                  {paymentMethodLabel} e-receipt
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPaymentProofModalOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close e-receipt"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-auto bg-slate-100 p-4">
              <img
                src={order.e_receipt_url}
                alt={`${paymentMethodLabel} payment e-receipt for order ${orderNumber}`}
                className="mx-auto max-w-full rounded-xl bg-white shadow-sm"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setPaymentProofModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <a
                href={order.e_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* HEADER */}
        <div className="bg-slate-50 px-4 py-4">
          <div className="flex justify-between">
            <div>
              <div className="flex gap-2 flex-wrap">
                {/* ORDER STATUS */}
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none ${getStatusColor(
                    status as any,
                    order.is_paid
                  )}`}
                >
                  {displayStatusLabel(status)}
                </span>

                {/* PAYMENT STATUS */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none ${
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
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none ${
                      order.payment_method === "gcash"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {order.payment_method === "gcash" ? "GCash" : "Cash"}
                  </span>
                )}

                {/* DISCOUNT INDICATOR */}
                {(order.discount_amount || 0) > 0 && (
                  <div className="space-y-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none border ${
                        order.discount_approved
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {orderDiscountLabel}: -₱{(order.discount_amount || 0).toFixed(2)}
                    </span>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${order.discount_approved ? "text-emerald-700" : "text-amber-700"}`}>
                      {order.discount_approved
                        ? `${order.coupon_id ? "Coupon" : order.senior_pwd_count ? "Senior/PWD" : "Discount"} discount approved`
                        : `${order.coupon_id ? "Coupon" : order.senior_pwd_count ? "Senior/PWD" : "Discount"} discount pending approval`
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                <p>{new Date(order.created_at).toLocaleString()}</p>
                <p>Table: {order.table?.table_number || "N/A"}</p>
              </div>
            </div>

            <div className="font-bold text-[#9B1C1C]">
              ₱{(order.total_amount - (order.discount_amount || 0)).toFixed(2)}
              {(order.discount_amount || 0) > 0 && (
                <div className="text-xs text-gray-500 font-normal">
                  (₱{order.total_amount.toFixed(2)} - ₱{(order.discount_amount || 0).toFixed(2)})
                </div>
              )}
            </div>
          </div>
        </div>

        {hasOnlinePaymentProof && (
          <div className="border-y border-violet-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-white px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white shadow-sm">
                  <FontAwesomeIcon icon={faReceipt} />
                </div>
                <div>
                  <p className="text-sm font-bold text-violet-950">Online payment proof attached</p>
                  <p className="text-xs text-violet-800">Verify this {paymentMethodLabel} e-receipt before marking the order as paid.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentProofModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 hover:shadow-md"
              >
                <FontAwesomeIcon icon={faReceipt} />
                View e-receipt
              </button>
            </div>
          </div>
        )}

        {/* ITEMS */}
        <div className="p-4 space-y-3">
          {order.items?.map((item: any, i: number) => {
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

                {item.selected_options && item.selected_options.length > 0 && (
                  <div className="ml-3 space-y-1 mb-2">
                    {item.selected_options.map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="flex justify-between text-xs text-slate-600">
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

                <div className="flex justify-end text-sm font-semibold text-slate-900">
                  ₱{itemTotal.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIONS */}
        <div className="p-4 flex flex-wrap gap-2">
          {(actions[status as keyof typeof actions] ?? []).map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              disabled={btn.disabled}
              className={`${btn.className} text-white px-3 py-2 rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {btn.label}
            </button>
          ))}
        </div>

      </div>
    </>
  );
};

export default BusinessOrderTile;
