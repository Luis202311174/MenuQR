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
  coupon_id?: string | null;
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
  discountVerificationModal: {
    orderId: string;
    orderNumber: string;
  } | null;
  setDiscountVerificationModal: React.Dispatch<React.SetStateAction<{ orderId: string; orderNumber: string } | null>>;

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
  staffSession?: boolean;
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
  discountVerificationModal,
  setDiscountVerificationModal,
  processingOrderId,
  businessId,
  paymentSettings,
  orders,
  fetchOrders,
  setOrders,
  setNotification,
  staffSession,
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

      if (staffSession) {
        if (!orderId) {
          throw new Error("Missing order ID for staff payment update");
        }

        const res = await fetch(`/api/staff/orders/${encodeURIComponent(orderId)}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to update payment status");
        }
      } else {
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus, is_paid: isPaid })
          .eq("id", orderId)
          .eq("business_id", businessId);

        if (error) throw error;
      }

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

      if (staffSession) {
        if (!markPaidModal.orderId) {
          throw new Error("Missing order ID for staff paid update");
        }

        const res = await fetch(`/api/staff/orders/${encodeURIComponent(markPaidModal.orderId)}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paid", payment_method: selectedMarkPaidMethod, reference_numb: updates.reference_numb }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to mark as paid");
        }
      } else {
        const { error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", markPaidModal.orderId)
          .eq("business_id", businessId);

        if (error) throw error;
      }

      setMarkPaidModal(null);
      setMarkPaidReference("");
      await fetchOrders();
    } catch (error: any) {
      console.error("Error marking order as paid:", error);
      alert(`Failed to mark order as paid: ${error.message}`);
    }
  };

  const getDiscountType = (order?: Order | null) => {
    if (!order) return "discount";
    if (order.coupon_id) return "coupon";
    if (order.senior_pwd_count && order.senior_pwd_count > 0) return "senior_pwd";
    return "discount";
  };

  const getDiscountLabel = (type: string) => {
    switch (type) {
      case "coupon":
        return "Coupon Discount";
      case "senior_pwd":
        return "Senior/PWD Discount";
      default:
        return "Discount";
    }
  };

  const handleApproveDiscount = async () => {
    if (!businessId || !discountVerificationModal) return;

    const order = orders.find((o) => o.id === discountVerificationModal.orderId);
    const discountType = getDiscountType(order);
    const discountLabel = getDiscountLabel(discountType);

    try {
      if (staffSession) {
        const res = await fetch(`/api/staff/orders/${discountVerificationModal.orderId}/discount`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to approve discount");
        }
      } else {
        const { error } = await supabase
          .from("orders")
          .update({ discount_approved: true })
          .eq("id", discountVerificationModal.orderId)
          .eq("business_id", businessId);

        if (error) throw error;
      }

      const tableNumber = order?.table?.table_number || "Unknown";

      setNotification({
        message: `${discountLabel} approved for Table ${tableNumber}`,
        type: "success",
      });

      setDiscountVerificationModal(null);
      await fetchOrders();
    } catch (error: any) {
      console.error("Error approving discount:", error);
      setNotification({ message: `Failed to approve discount: ${error.message}`, type: "error" });
    }
  };

  const handleRejectDiscount = async () => {
    if (!businessId || !discountVerificationModal) return;

    const order = orders.find((o) => o.id === discountVerificationModal.orderId);
    if (!order) return;

    const discountType = getDiscountType(order);
    const discountLabel = discountType === "coupon" ? "Coupon discount" : "Senior/PWD discount";

    try {
      if (staffSession) {
        const res = await fetch(`/api/staff/orders/${discountVerificationModal.orderId}/discount`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to reject discount");
        }
      } else {
        const discountAmount = Number(order.discount_amount || 0);
        const originalTotal = Number(order.total_amount || 0) + discountAmount;
        const updatePayload: any = {
          discount_amount: 0,
          discount_approved: false,
          total_amount: originalTotal,
        };

        if (discountType === "coupon") {
          updatePayload.coupon_id = null;
        }

        const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", discountVerificationModal.orderId)
          .eq("business_id", businessId);

        if (error) throw error;
      }

      const tableNumber = order.table?.table_number || "Unknown";
      setNotification({
        message: `${discountLabel} rejected for Table ${tableNumber}`,
        type: "success",
      });

      setDiscountVerificationModal(null);
      await fetchOrders();
    } catch (error: any) {
      console.error("Error rejecting discount:", error);
      setNotification({ message: `Failed to reject discount: ${error.message}`, type: "error" });
    }
  };

  const discountOrder = discountVerificationModal ? orders.find((o) => o.id === discountVerificationModal.orderId) : null;
  const discountType = getDiscountType(discountOrder);
  const discountLabel = getDiscountLabel(discountType);

  const cancelOrder = async (orderId: string) => {
    if (!businessId) return;

    try {
      if (staffSession) {
        if (!orderId) {
          throw new Error("Missing order ID for staff cancel update");
        }

        const res = await fetch(`/api/staff/orders/${encodeURIComponent(orderId)}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to cancel order");
        }
      } else {
        const { error } = await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId)
          .eq("business_id", businessId);

        if (error) throw error;
      }

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

      {/* Discount Verification Modal */}
      {discountVerificationModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Verify {discountLabel}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Order #{discountVerificationModal.orderNumber}
            </p>
            <div className="space-y-4">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
                <p className="font-semibold">This order requested a {discountLabel.toLowerCase()}.</p>
                <p className="text-sm mt-2 text-slate-600">
                  Confirm whether the submitted discount is valid before proceeding.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleApproveDiscount}
                  disabled={processingOrderId === discountVerificationModal.orderId}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50"
                >
                  Approve Discount
                </button>
                <button
                  onClick={handleRejectDiscount}
                  disabled={processingOrderId === discountVerificationModal.orderId}
                  className="w-full py-4 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold transition disabled:opacity-50"
                >
                  Reject Discount
                </button>
              </div>
              <button
                onClick={() => setDiscountVerificationModal(null)}
                className="w-full py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
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

