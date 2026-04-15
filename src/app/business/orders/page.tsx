"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

type Order = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  items: any[];
  table_id?: string | null;
  session_id?: string | null;
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
  const displayStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Accept Order";
      case "received":
        return "Paid";
      case "ready":
        return "Preparing";
      case "completed":
        return "Order Delivered";
      default:
        return status;
    }
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
        ["pending", "received", "ready"].includes(o.status)
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

  // ⚡ REALTIME
  useEffect(() => {
    if (!businessId) return;

    fetchOrders();

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
              !["pending", "received", "ready"].includes(order.status)
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

  // 🔄 Update status
  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  };

  // ✅ Complete order
  const completeOrder = async (order: Order) => {
    if (!businessId || completingOrderId === order.id) return;

    setCompletingOrderId(order.id);

    try {
      console.log("OWNER completeOrder()", { order });

      await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      await handleOrderCompleted(order);
    } finally {
      setCompletingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        <BusinessSidebar />

        <main className="p-8 bg-white">
          <h1 className="text-3xl font-bold mb-6">Orders</h1>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "pending":
                      return "bg-blue-100 border-blue-300 text-blue-700";
                    case "received":
                      return "bg-yellow-100 border-yellow-300 text-yellow-700";
                    case "ready":
                      return "bg-green-100 border-green-300 text-green-700";
                    default:
                      return "bg-gray-100 border-gray-300 text-gray-700";
                  }
                };

                return (
                  <div
                    key={order.id}
                    className={`border-2 rounded-lg p-6 ${getStatusColor(order.status)}`}
                  >
                    <div className="flex justify-between mb-4">
                      <div>
                        <p className="font-bold uppercase">{displayStatusLabel(order.status)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Table: {order.table?.table_number || "N/A"}
                        </p>
                      </div>

                      <p className="text-xl font-bold text-[#E23838]">
                        ₱{Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>

                    <div className="mb-4">
                      {order.items?.map((item, i) => (
                        <p key={i} className="text-sm">
                          • {item.name} - ₱{item.price}
                        </p>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {order.status === "pending" && (
                        <button
                          onClick={() => updateStatus(order.id, "received")}
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Accept Order
                        </button>
                      )}

                      {order.status === "received" && (
                        <button
                          onClick={() => updateStatus(order.id, "ready")}
                          className="bg-yellow-600 text-white px-4 py-2 rounded"
                        >
                          Preparing
                        </button>
                      )}

                      {order.status === "ready" && (
                        <button
                          onClick={() => completeOrder(order)}
                          disabled={completingOrderId === order.id}
                          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                          {completingOrderId === order.id ? "Completing..." : "Order Delivered"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No orders yet</p>
          )}
        </main>
      </div>
    </div>
  );
}