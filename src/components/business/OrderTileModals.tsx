"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Order = {
  id: string;
  status: string;
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
  total_guests?: number;
  senior_pwd_count?: number;
  discount_amount?: number;
  discount_approved?: boolean;
};

type PaymentStatusModal = {
  orderId: string;
  orderNumber: string;
} | null;

type CancelOrderModal = {
  orderId: string;
  orderNumber: string;
} | null;

type MarkPaidModal = {
  orderId: string;
  orderNumber: string;
  paymentMethod: "cash" | "gcash";
} | null;

type Props = {
  paymentStatusModal: PaymentStatusModal;
  setPaymentStatusModal: React.Dispatch<React.SetStateAction<PaymentStatusModal>>;
  cancelOrderModal: CancelOrderModal;
  setCancelOrderModal: React.Dispatch<React.SetStateAction<CancelOrderModal>>;
  markPaidModal: MarkPaidModal;
  setMarkPaidModal: React.Dispatch<React.SetStateAction<MarkPaidModal>>;

  processingOrderId: string | null;
  businessId: string | null;

  paymentSettings: {
    cash: boolean;
    gcash: boolean;
  };

  orders: Order[];
  fetchOrders: () => Promise<void>;

  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;

  setNotification: React.Dispatch<
    React.SetStateAction<{ message: string; type?: "success" | "error" } | null>
  >;
};

const safeDisabled = (processingOrderId: string | null, orderId: string) =>
  processingOrderId === orderId;


export default function OrderTileModals({
  paymentStatusModal,
  setPaymentStatusModal,
  cancelOrderModal,
  setCancelOrderModal,
  markPaidModal,
  setMarkPaidModal,
  processingOrderId,
  businessId,
  paymentSettings,
  orders,
  fetchOrders,
  setOrders,
  setNotification,
}: Props) {
  const [selectedMarkPaidMethod, setSelectedMarkPaidMethod] = useState<"cash" | "gcash">("cash");
  const [markPaidReference, setMarkPaidReference] = useState<string>("");

  useEffect(() => {
    if (!markPaidModal) return;
    setSelectedMarkPaidMethod(markPaidModal.paymentMethod || "cash");
    setMarkPaidReference("");
  }, [markPaidModal]);

  const handlePaymentStatus = async (orderId: string, isPaid: boolean) => {
    if (!businessId) return;
    try {
      const newStatus = isPaid ? "paid" : "received";

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, is_paid: isPaid })
        .eq("id", orderId)
        .eq("business_id", businessId);

      if (error) throw error;

      setPaymentStatusModal(null);

      const order = orders.find((o) => o.id === orderId);
      const tableNumber = order?.table?.table_number || "Unknown";
      const paymentType = isPaid ? "paid" : "pay later";

      setNotification({
        message: `Table ${tableNumber} Order marked as ${paymentType}`,
        type: "success",
      });

      await fetchOrders();
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      setNotification({ message: `Failed to update payment status: ${error.message}`, type: "error" });
    }
  };

  const handleConfirmMarkPaid = async () => {
    if (!businessId || !markPaidModal) return;

    try {
      const updates: any = {
        status: "paid",
        is_paid: true,
        payment_method: selectedMarkPaidMethod,
      };

      if (selectedMarkPaidMethod === "gcash") {
        updates.reference_numb = markPaidReference;
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", markPaidModal.orderId)
        .eq("business_id", businessId);

      if (error) throw error;

      setMarkPaidModal(null);
      setMarkPaidReference("");
      await fetchOrders();
    } catch (error: any) {
      console.error("Error marking order as paid:", error);
      alert(`Failed to mark order as paid: ${error.message}`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!businessId) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("business_id", businessId);

      if (error) throw error;

      const channel = supabase.channel(`order-${orderId}`);
      channel.send({
        type: "broadcast",
        event: "order_cancelled",
        payload: { orderId, message: "Your order has been cancelled" },
      });

      setCancelOrderModal(null);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert(`Failed to cancel order: ${error.message}`);
    }
  };

  return (
    <>
      {/* Payment Status Modal */}
      {paymentStatusModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Order #{paymentStatusModal.orderNumber}
            </h3>
            <p className="text-sm text-slate-600 mb-6">How did the customer pay?</p>
            <div className="space-y-3">
              <button
                onClick={() => handlePaymentStatus(paymentStatusModal.orderId, false)}
                disabled={processingOrderId === paymentStatusModal.orderId}
                className="w-full p-4 rounded-2xl border-2 border-[#F2B90F] bg-[#FFF7E0] hover:bg-[#F3D87B] text-[#8F5A00] font-semibold transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">⏰</span>
                <div className="text-left">
                  <p>Order Received</p>
                  <p className="text-xs font-normal">Will pay later</p>
                </div>
              </button>
              <button
                onClick={() => handlePaymentStatus(paymentStatusModal.orderId, true)}
                disabled={processingOrderId === paymentStatusModal.orderId}
                className="w-full p-4 rounded-2xl border-2 border-[#10B981] bg-[#ECFDF5] hover:bg-[#A7F3D0] text-[#065F46] font-semibold transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">✅</span>
                <div className="text-left">
                  <p>Order Paid</p>
                  <p className="text-xs font-normal">Payment received</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setPaymentStatusModal(null)}
              className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelOrderModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">❌ Cancel Order?</h3>
            <p className="text-sm text-slate-600 mb-6">Order #{cancelOrderModal.orderNumber}</p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will void the order and notify the customer. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => cancelOrder(cancelOrderModal.orderId)}
                disabled={processingOrderId === cancelOrderModal.orderId}
                className="w-full p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50"
              >
                Confirm Cancel Order
              </button>
              <button
                onClick={() => setCancelOrderModal(null)}
                disabled={processingOrderId === cancelOrderModal.orderId}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-semibold transition disabled:opacity-50"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-[#E23838] px-6 py-4 text-center">
              <h3 className="text-2xl font-bold text-white">Mark Order as Paid</h3>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-sm text-slate-600">Order #{markPaidModal.orderNumber}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment method</label>
                <select
                  value={selectedMarkPaidMethod}
                  onChange={(e) => setSelectedMarkPaidMethod(e.target.value as "cash" | "gcash")}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                >
                  {paymentSettings.cash && <option value="cash">Cash</option>}
                  {paymentSettings.gcash && <option value="gcash">GCash</option>}
                </select>
              </div>

              {selectedMarkPaidMethod === "gcash" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">GCash reference number</label>
                  <input
                    type="text"
                    placeholder="Reference number"
                    value={markPaidReference}
                    onChange={(e) => setMarkPaidReference(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                  />
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmMarkPaid}
                  disabled={
                    processingOrderId === markPaidModal.orderId ||
                    (selectedMarkPaidMethod === "gcash" && !markPaidReference.trim())
                  }
                  className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm Payment
                </button>
                <button
                  type="button"
                  onClick={() => setMarkPaidModal(null)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

