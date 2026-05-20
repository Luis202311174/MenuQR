"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import BusinessOrderTile from "@/components/business/BusinessOrderTile";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import BusinessSettingsPaymentModal from "@/components/business/BusinessSettingsPaymentModal";
import OrderTileModals from "@/components/business/OrderTileModals";
import PageShell from "@/components/PageShell";
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

export default function BusinessOrdersPage() {
  const router = useRouter();
  const auth = useBusinessAuth("orders", "view");

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Restaurant");
  const [businessAddress, setBusinessAddress] = useState<string>("");
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
  const [discountVerificationModal, setDiscountVerificationModal] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [paymentSettings, setPaymentSettings] = useState({
    cash: true,
    gcash: false,
  });

  const [markPaidModal, setMarkPaidModal] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod: "cash" | "gcash";
  } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);


  const openDiscountVerification = (orderId: string, orderNumber: string) => {
    setDiscountVerificationModal({ orderId, orderNumber });
  };

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
  const audioRef = useRef<AudioContext | null>(null);

  const playNewOrderSound = () => {
    if (typeof window === "undefined") return;

    const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioConstructor) return;

    if (!audioRef.current) {
      audioRef.current = new AudioConstructor();
    }

    const context = audioRef.current;
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const gain = context.createGain();
    gain.gain.value = 0.5;
    gain.connect(context.destination);

    const now = context.currentTime;
    const tones = [880, 660, 1040];

    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 1 ? "square" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.05);
      oscillator.stop(now + 0.2 + index * 0.05);
    });
  };

  // 🔐 Auth + business
  useEffect(() => {
    if (!auth.checked) return;

    const init = async () => {
      if (auth.owner) {
        const { data } = await supabase.auth.getSession();
        const sess = data.session;
        if (!sess?.user) return;

        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, address")
          .eq("owner_id", sess.user.id)
          .single();

        if (bizData) {
          setBusinessId(bizData.id);
          setBusinessName(bizData.name || "Restaurant");
          setBusinessAddress(bizData.address || "");
        }
      }

      if (auth.staffSession) {
        setBusinessId(auth.staffSession.businessId);
        const { data: bizData, error } = await supabase
          .from("businesses")
          .select("name, address")
          .eq("id", auth.staffSession.businessId)
          .single();

        if (!error && bizData) {
          setBusinessName(bizData.name || "Restaurant");
          setBusinessAddress(bizData.address || "");
        }
      }
    };

    init();
  }, [auth]);

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
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setOrders(
      (data || []).filter((o) =>
        ["pending", "pending_payment", "received", "paid", "preparing", "ready", "served"].includes(o.status)  // ✅ ADD "pending_payment"
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
              !["pending", "pending_payment", "received", "paid", "preparing", "ready", "served"].includes(order.status)  // ✅ ADD "pending_payment"
            ) {
              return prev.filter((o) => o.id !== order.id);
            }

            if (exists) {
              return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
            }

            playNewOrderSound();
            setNotification({
              message: `New order received from Table ${order.table?.table_number || "N/A"}`,
              type: "success",
            });

            return [...prev, order];
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

  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  // 🔄 Update status handlers
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setProcessingOrderId(orderId);
      const order = orders.find(o => o.id === orderId);
      const tableNumber = order?.table?.table_number || "Unknown";

      switch (newStatus) {
        case "pending_payment":
        // Handle if needed, or leave as is
        break;
        case "received":
          await confirmOrderReceived(orderId);
          setNotification({ message: `Table ${tableNumber} Order accepted successfully`, type: "success" });
          break;
        case "paid":
          await confirmOrderPaid(orderId);
          setNotification({ message: `Table ${tableNumber} Order marked as paid`, type: "success" });
          break;
        case "preparing":
          await markOrderPreparing(orderId);
          setNotification({ message: `Table ${tableNumber} Order now preparing`, type: "success" });
          break;
        case "ready":
          await markOrderReady(orderId);
          setNotification({ message: `Table ${tableNumber} Order ready for pickup`, type: "success" });
          break;
        case "served":
          await markOrderServed(orderId);
          setNotification({ message: `Table ${tableNumber} Order served`, type: "success" });
          break;
        default:
          break;
      }
    } catch (error: any) {
      console.error("Error updating order status:", JSON.stringify(error, null, 2));
      setNotification({ message: `Failed to update order status: ${error.message}`, type: "error" });
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
    <PageShell
      title="Orders"
      subtitle="Manage incoming orders and payment workflows."
      backHref="/business/dashboard"
      action={
        <button
          onClick={() => setSettingsOpen(true)}
          className="group inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-200"
        >
          <FontAwesomeIcon
            icon={faGear}
            className="text-xs sm:text-sm transition-transform duration-200 group-hover:rotate-90"
          />
          <span>Select Payment Option</span>
        </button>
      }
    >
      {!auth.checked ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg text-gray-600">Loading orders…</p>
        </div>
      ) : (
        <div>
          <div>
            <main className="space-y-4 sm:space-y-8">
              <section className="space-y-4 sm:space-y-6">

                  <div>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Overview</p>
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 sm:mt-2">
                      Order Queue Status
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <div className="rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#FCEAEA] to-[#F5C6C6] text-[#9B1C1C] p-4 sm:p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-xs sm:text-sm font-medium">To Confirm</p>
                      <p className="text-2xl sm:text-5xl font-black mt-2 sm:mt-4">{pendingCount}</p>
                      <p className="text-xs mt-1 sm:mt-3 font-medium">New orders</p>
                    </div>  
                    <div className="rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#FFF7E0] to-[#F3D87B] text-[#8F5A00] p-4 sm:p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-xs sm:text-sm font-medium">Unpaid</p>
                      <p className="text-2xl sm:text-5xl font-black mt-2 sm:mt-4">{receivedCount}</p>
                      <p className="text-xs mt-1 sm:mt-3 font-medium">Pay later</p>
                    </div>
                    <div className="rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#E0F2FE] to-[#7DD3FC] text-[#0C4A6E] p-4 sm:p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-xs sm:text-sm font-medium">Paid</p>
                      <p className="text-2xl sm:text-5xl font-black mt-2 sm:mt-4">{paidCount}</p>
                      <p className="text-xs mt-1 sm:mt-3 font-medium">Payment received</p>
                    </div>
                    <div className="rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#ECFDF5] to-[#A7F3D0] text-[#065F46] p-4 sm:p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-xs sm:text-sm font-medium">In Progress</p>
                      <p className="text-2xl sm:text-5xl font-black mt-2 sm:mt-4">{preparingCount + readyCount}</p>
                      <p className="text-xs mt-1 sm:mt-3 font-medium">Kitchen & serving</p>
                    </div>
                  </div>
                </section>

              {orders.length > 0 ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-xl font-semibold text-slate-900">Order Queue</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Manage incoming orders in real-time</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2">
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
                        setMarkPaidModal={setMarkPaidModal}
                        businessName={businessName}
                        businessAddress={businessAddress}
                        verifyDiscount={openDiscountVerification}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                  <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                        Waiting for new orders
                      </p>
                      <h2 className="text-lg sm:text-2xl font-bold text-slate-900">No active orders yet</h2>
                    </div>
                    <div className="rounded-full bg-[#F9F1ED] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#8F5A00]">
                      Ready when customers order
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-8 rounded-[20px] sm:rounded-[28px] border border-[#F7E8DC] bg-[#FFF5EA] px-4 sm:px-10 py-6 sm:py-12 text-center shadow-sm">
                    <div className="mx-auto mb-3 sm:mb-5 flex h-10 sm:h-16 w-10 sm:w-16 items-center justify-center rounded-full bg-[#FEEFEA] text-xl sm:text-3xl">
                      🕒
                    </div>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8F5A00]">Live order queue</p>
                    <h3 className="mt-2 sm:mt-3 text-lg sm:text-2xl font-bold text-slate-900">Waiting for orders</h3>
                    <p className="mt-2 sm:mt-3 max-w-lg mx-auto text-xs sm:text-sm leading-5 sm:leading-6 text-slate-600">
                      Your menu is live and ready. Incoming customer orders will appear here automatically.
                    </p>
                    <div className="mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-full bg-[#E23838] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm">
                      <span>Live order feed</span>
                      <span className="inline-flex h-2 w-2.5 sm:h-2.5 sm:w-2.5 rounded-full bg-[#F2FF00]" />
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      <OrderTileModals
        paymentStatusModal={paymentStatusModal}
        setPaymentStatusModal={setPaymentStatusModal}
        cancelOrderModal={cancelOrderModal}
        setCancelOrderModal={setCancelOrderModal}
        markPaidModal={markPaidModal}
        setMarkPaidModal={setMarkPaidModal}
        discountVerificationModal={discountVerificationModal}
        setDiscountVerificationModal={setDiscountVerificationModal}
        processingOrderId={processingOrderId}
        businessId={businessId}
        paymentSettings={paymentSettings}
        orders={orders}
        fetchOrders={fetchOrders}
        setOrders={setOrders}
        setNotification={setNotification}
      />

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



      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[2000] animate-slide-in">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg text-white min-w-[250px] ${
              notification.type === "error" ? "bg-red-500" : "bg-green-500"
            }`}
          >
            <div className="flex justify-between items-center gap-4">
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="text-white font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}