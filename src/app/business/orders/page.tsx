"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrderTile from "@/components/business/BusinessOrderTile";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import BusinessSettingsPaymentModal from "@/components/business/BusinessSettingsPaymentModal";
import {
  confirmOrderReceived,
  confirmOrderPaid,
  markOrderPreparing,
  markOrderReady,
  markOrderServed,
  markOrderCompleted,
  getOrderStatusLabel,
  getStatusColor,
} from "@/utils/orderStatusManager";

type Order = {
  id: string;
  status: string;
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

export default function BusinessOrdersPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [paymentStatusModal, setPaymentStatusModal] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [cancelOrderModal, setCancelOrderModal] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [paymentSettings, setPaymentSettings] = useState({
    cash: true,
    gcash: false,
  });

  useEffect(() => {
    if (!businessId) return;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("cash_enabled, gcash_enabled")
        .eq("id", businessId)
        .maybeSingle(); // 👈 better than single()

      if (error) {
        console.error("loadSettings error:", error);
        return;
      }

      if (!data) return;

      setPaymentSettings({
        cash: data.cash_enabled ?? true,
        gcash: data.gcash_enabled ?? false,
      });
    };

    loadSettings();
  }, [businessId]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const channelRef = useRef<any>(null);

  // 🔐 Auth + business
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);
      if (!sess?.user) return router.push("/");

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", sess.user.id)
        .single();

      if (user?.role !== "owner") return router.push("/");

      setSession(sess);

      const { data: bizData } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", sess.user.id)
        .single();

      if (bizData) setBusinessId(bizData.id);
    };

    init();
  }, [router]);

  // 📦 Fetch orders
  const displayStatusLabel = (status: string, isPaid?: boolean) => {
    return getOrderStatusLabel(status as any, isPaid);
  };

  const fetchOrders = async () => {
    if (!businessId) return;

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        table:table_id (
          id,
          table_number
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setOrders(
      (data || []).filter((o) =>
        ["pending", "received", "paid", "preparing", "ready", "served"].includes(o.status)
      )
    );
  };

  const handleOrderCompleted = async (order: Order) => {
    if (order.session_id) {
      await supabase
        .from("table_sessions")
        .update({
          active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", order.session_id);
    }

    if (order.table_id) {
      await supabase
        .from("tables")
        .update({
          current_session_id: null,
          status: "available",
        })
        .eq("id", order.table_id);
    }
  };

  // 📦 Initial fetch of orders on mount
  useEffect(() => {
    if (!businessId) return;
    fetchOrders();
  }, [businessId]);

  // ⚡ REALTIME
  useEffect(() => {
    if (!businessId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`orders-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          console.log("OWNER realtime event:", {
            eventType: payload.eventType,
            newOrder: payload.new,
            oldOrder: payload.old,
            businessId,
          });

          if (payload.eventType === "DELETE") {
            const oldOrder = payload.old as Order;
            setOrders((prev) => prev.filter((o) => o.id !== oldOrder.id));
            return;
          }

          const order = payload.new as Order;
          if (!order) return;

          if (order.status === "completed") {
            console.log("OWNER completed order event:", { order });
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
            await handleOrderCompleted(order);
            return;
          }

          setOrders((prev) => {
            const exists = prev.some((o) => o.id === order.id);

            if (
              !["pending", "received", "paid", "preparing", "ready", "served"].includes(order.status)
            ) {
              return prev.filter((o) => o.id !== order.id);
            }

            if (exists) {
              return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
            }

            return [order, ...prev];
          });

          fetchOrders();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [businessId]);

  // 🔄 Update status handlers
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setProcessingOrderId(orderId);
      switch (newStatus) {
        case "received":
          await confirmOrderReceived(orderId);
          break;
        case "paid":
          await confirmOrderPaid(orderId);
          break;
        case "preparing":
          await markOrderPreparing(orderId);
          break;
        case "ready":
          await markOrderReady(orderId);
          break;
        case "served":
          await markOrderServed(orderId);
          break;
        default:
          break;
      }
    } catch (error: any) {
      console.error("Error updating order status:", JSON.stringify(error, null, 2));
      alert(`Failed to update order status: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // 💳 Handle payment status (Received vs Paid)
  const handlePaymentStatus = async (orderId: string, isPaid: boolean) => {
    if (!businessId) return;
    setProcessingOrderId(orderId);
    try {
      const newStatus = isPaid ? "paid" : "received";
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus, is_paid: isPaid })
        .eq("id", orderId)
        .eq("business_id", businessId)
        .select()
        .single();
      
      if (error) throw error;
      console.log("Payment status updated:", data);
      setPaymentStatusModal(null);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      alert(`Failed to update payment status: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // 💰 Mark order as paid (from received unpaid state)
  const markAsPaid = async (orderId: string) => {
    if (!businessId) return;
    setProcessingOrderId(orderId);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "paid", is_paid: true })
        .eq("id", orderId)
        .eq("business_id", businessId)
        .select()
        .single();

      if (error) throw error;
      console.log("Order marked as paid:", data);
    } catch (error: any) {
      console.error("Error marking as paid:", error);
      alert(`Failed to mark order as paid: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // ❌ Cancel order (void it)
  const cancelOrder = async (orderId: string) => {
    if (!businessId) return;
    setProcessingOrderId(orderId);
    try {
      // Update order status to cancelled
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("business_id", businessId)
        .select()
        .single();

      if (error) throw error;
      console.log("Order cancelled:", data);

      // Notify the user via realtime
      const channel = supabase.channel(`order-${orderId}`);
      channel.send({
        type: "broadcast",
        event: "order_cancelled",
        payload: { orderId, message: "Your order has been cancelled" }
      });

      setCancelOrderModal(null);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert(`Failed to cancel order: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // ✅ Complete order
  const completeOrder = async (order: Order) => {
    if (!businessId || completingOrderId === order.id) return;

    setCompletingOrderId(order.id);

    try {
      console.log("OWNER completeOrder()", { order });

      await markOrderCompleted(order.id);

      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      await handleOrderCompleted(order);
    } catch (error) {
      console.error("Error completing order:", error);
      alert("Failed to complete order");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const receivedCount = orders.filter(o => o.status === "received" && !o.is_paid).length;
  const paidCount = orders.filter(o => o.status === "paid" || (o.status === "received" && o.is_paid)).length;
  const preparingCount = orders.filter(o => o.status === "preparing").length;
  const readyCount = orders.filter(o => o.status === "ready").length;
  const servedCount = orders.filter(o => o.status === "served").length;
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr] gap-8 px-4 py-8">
        <BusinessSidebar />

        <main className="space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                    Order Management
                  </p>
                  <h1 className="text-3xl font-bold text-slate-900 mt-1">Live Orders</h1>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {orders.length} active orders
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              {/* Helper text */}
              <p className="text-sm text-slate-500">
                Configure how customers can pay for their orders.
              </p>

              {/* Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="group inline-flex items-center gap-2 px-4 py-2.5 
                          rounded-xl border border-slate-200 bg-white 
                          text-sm font-semibold text-slate-700 shadow-sm
                          hover:bg-slate-900 hover:text-white hover:border-slate-900
                          transition-all duration-200"
              >
                <FontAwesomeIcon
                  icon={faGear}
                  className="text-sm transition-transform duration-200 group-hover:rotate-90"
                />
                <span>Select Payment Option</span>
              </button>

            </div>
          </div>

          {orders.length > 0 && (
            <section className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Overview</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  Order Queue Status
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-[24px] bg-gradient-to-br from-[#FCEAEA] to-[#F5C6C6] text-[#9B1C1C] p-8 shadow-sm hover:shadow-md transition">
                  <p className="text-sm font-medium">
                    To Confirm
                  </p>
                  <p className="text-5xl font-black mt-4">
                    {pendingCount}
                  </p>
                  <p className="text-xs mt-3 font-medium">New orders</p>
                </div>

                <div className="rounded-[24px] bg-gradient-to-br from-[#FFF7E0] to-[#F3D87B] text-[#8F5A00] p-8 shadow-sm hover:shadow-md transition">
                  <p className="text-sm font-medium">
                    Unpaid
                  </p>
                  <p className="text-5xl font-black mt-4">
                    {receivedCount}
                  </p>
                  <p className="text-xs mt-3 font-medium">Pay later</p>
                </div>

                <div className="rounded-[24px] bg-gradient-to-br from-[#E0F2FE] to-[#7DD3FC] text-[#0C4A6E] p-8 shadow-sm hover:shadow-md transition">
                  <p className="text-sm font-medium">
                    Paid
                  </p>
                  <p className="text-5xl font-black mt-4">
                    {paidCount}
                  </p>
                  <p className="text-xs mt-3 font-medium">Payment received</p>
                </div>

                <div className="rounded-[24px] bg-gradient-to-br from-[#ECFDF5] to-[#A7F3D0] text-[#065F46] p-8 shadow-sm hover:shadow-md transition">
                  <p className="text-sm font-medium">
                    In Progress
                  </p>
                  <p className="text-5xl font-black mt-4">
                    {preparingCount + readyCount}
                  </p>
                  <p className="text-xs mt-3 font-medium">Kitchen & serving</p>
                </div>
              </div>
            </section>
          )}

          {orders.length > 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Order Queue</h2>
                <p className="text-sm text-slate-500">Manage incoming orders in real-time</p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {orders.map((order) => (
                <BusinessOrderTile
                  key={order.id}
                  order={order}
                  displayStatusLabel={displayStatusLabel}
                  getStatusBgColor={getStatusColor}
                  processingOrderId={processingOrderId}
                  completingOrderId={completingOrderId}
                  updateOrderStatus={updateOrderStatus}
                  markAsPaid={markAsPaid}
                  setPaymentStatusModal={setPaymentStatusModal}
                  setCancelOrderModal={setCancelOrderModal}
                  completeOrder={completeOrder}
                />
              ))}
            </div>
            </div>
          ) : (
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                    Waiting for new orders
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">No active orders yet</h2>
                </div>
                <div className="rounded-full bg-[#F9F1ED] px-4 py-2 text-sm font-semibold text-[#8F5A00]">
                  Ready when customers order
                </div>
              </div>

              <div className="mt-8 rounded-[28px] border border-[#F7E8DC] bg-[#FFF5EA] px-10 py-12 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEEFEA] text-3xl">
                  🕒
                </div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#8F5A00]">Live order queue</p>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">Waiting for orders</h3>
                <p className="mt-3 max-w-lg mx-auto text-sm leading-6 text-slate-600">
                  Your menu is live and ready. Incoming customer orders will appear here automatically.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E23838] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  <span>Live order feed</span>
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#F2FF00]" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Payment Status Modal */}
      {paymentStatusModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Order #{paymentStatusModal.orderNumber}</h3>
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
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
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
      <BusinessSettingsPaymentModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialCash={paymentSettings.cash}
        initialGcash={paymentSettings.gcash}
        onSave={async (data) => {
          setPaymentSettings(data);
          setSettingsOpen(false);

          const { error } = await supabase
            .from("businesses")
            .update({
              cash_enabled: data.cash,
              gcash_enabled: data.gcash,
            })
            .eq("id", businessId);

          if (error) {
            console.error(error);
            alert("Failed to save payment settings");
          }
        }}
      />
    </div>
  );
}