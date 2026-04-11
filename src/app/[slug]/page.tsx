"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import MenuGrid from "@/components/MenuGrid";
import SlugSidebar from "@/components/SlugSidebar";
import { fetchBusinessBySlug } from "@/utils/fetchBusinessBySlug";
import { fetchMenuItems } from "@/utils/fetchMenuItems";
import { supabase } from "@/lib/supabaseClient";
import { handleTableSession } from "@/utils/handleTableSession";
import OrdersButton from "@/components/OrdersButton";

type OrderStatus = "none" | "pending" | "received" | "ready" | "completed";
type CategoryType = "all" | "Meals" | "Beverage" | "Solo" | "Extras" | "Dessert";
type OrderItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
};

type OrderData = {
  id: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  table_id?: string | null;
  created_at: string;
  updated_at?: string;
};

export default function BusinessPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  const [business, setBusiness] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("none");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [orderCompleteModal, setOrderCompleteModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<CategoryType>("all");
  const updateSlug = (newSlug: string, newTableId?: string | null) => {
    const query = newTableId ? `?table=${newTableId}` : "";
    router.replace(`/${newSlug}${query}`);
  };

  const [notification, setNotification] = useState<{
    message: string;
    type?: "success" | "error";
  } | null>(null);

  const isDineIn = !!tableId && !!sessionId;

  // Ref to track currentOrderId for realtime callback
  const currentOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentOrderIdRef.current = currentOrderId;
  }, [currentOrderId]);

  // 🔹 Load business + menu + session
  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      const biz = await fetchBusinessBySlug(slug as string);
      if (!biz) return setBusiness(null);

      setBusiness(biz);

      const menus = await fetchMenuItems(biz.id);
      setMenuItems(menus);

      if (tableId) {
        try {
          const session = await handleTableSession(tableId);
          setSessionId(session);
        } catch (err) {
          console.error("Session error:", err);
        }
      }
    };

    load();
  }, [slug, tableId]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [notification]);

  // 🔹 Cart logic
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const handleAddToCart = (item: any) => setCartItems((prev) => [...prev, item]);
  const handleRemoveFromCart = (index: number) => setCartItems((prev) => prev.filter((_, i) => i !== index));

  // 🔹 Submit order
  const handleSubmitOrder = async () => {
    if (!cartItems.length) return alert("Cart is empty");

    setSubmittingOrder(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const orderData: any = {
        business_id: business.id,
        items: cartItems,
        total_amount: cartTotal,
        status: "pending",
        ...(tableId && { table_id: tableId }),
        ...(sessionId && { session_id: sessionId }),
        ...(userId && { user_id: userId }),
      };

      const { data, error } = await supabase.from("orders").insert(orderData).select("*").single();
      if (error) throw error;

      setCurrentOrderId(data.id);
      currentOrderIdRef.current = data.id;
      setOrderStatus(data.status);
      setCartItems([]);
      setNotification({
        message: "Order submitted successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        message: "Failed to submit order",
        type: "error",
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleOrderCompleted = async (order: OrderData) => {
    if (isCompleting) return; // 🛑 prevent duplicate execution
    setIsCompleting(true);
    setCompletedOrder(order);
    setCurrentOrder(order);
    setOrderCompleteModal(true);
    setOrderStatus(order.status);
  };

  const closeOrderCompleteModal = async () => {
    setOrderCompleteModal(false);

    setCurrentOrder(null);
    setCurrentOrderId(null);
    currentOrderIdRef.current = null;
    setOrderStatus("none");
    setCartItems([]);

    if (sessionId) {
      await supabase
        .from("table_sessions")
        .update({
          active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    updateSlug(slug as string, null);
    router.refresh();
    setCompletedOrder(null);
    setIsCompleting(false);
  };

  // 🔹 Load current active order for this table/session
  useEffect(() => {
    if (!sessionId || !business?.id || !tableId) return;

    const channel = supabase
      .channel(`orders-table-${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const newOrder = payload.new as OrderData;
          const oldOrder = payload.old as OrderData;

          // DELETE
          if (payload.eventType === "DELETE") {
            if (oldOrder?.id === currentOrderId) {
              setCurrentOrder(null);
              setCurrentOrderId(null);
              currentOrderIdRef.current = null;
              setOrderStatus("none");
            }
            return;
          }

          if (!newOrder) return;

          // ACTIVE ORDERS
          if (["pending", "received", "ready"].includes(newOrder.status)) {
            setCurrentOrder(newOrder);
            setCurrentOrderId(newOrder.id);
            currentOrderIdRef.current = newOrder.id;
            setOrderStatus(newOrder.status);
          }

          // COMPLETED
          if (newOrder.status === "completed" && newOrder.id === currentOrderIdRef.current) {
            handleOrderCompleted(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, tableId, business?.id]); // ✅ FIXED: Removed currentOrderId from dependency array

  if (!business) return <div className="p-6 text-center">Loading...</div>;

  // 🔹 Filtering
  const filteredItems =
    categoryFilter === "all" ? menuItems : menuItems.filter((i) => i.category === categoryFilter);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;
  const qrUrl =
    business.qr_code_url ||
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      `${baseUrl}/${slug}${tableId ? `?table=${tableId}` : ""}`
    )}`;

  return (
    <div className="min-h-screen bg-[#FCFBF4] px-4 py-6 sm:px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        {/* Sidebar */}
        <SlugSidebar
          qrUrl={qrUrl}
          tableId={tableId}
          currentOrder={currentOrder}
          orderStatus={orderStatus}
          cartItems={cartItems}
          cartTotal={cartTotal}
        />

        {/* Main content */}
        <main className="space-y-6">
          {/* Business info */}
          <section className="bg-white border border-gray-300 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-48 h-48 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-300 shadow-md">
              <img
                src={business.logo_url || "/hero-icon.png"}
                alt="Business"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold mb-2">{business.name}</h3>
              <p className="text-gray-700 mb-1">{business.address}</p>
              <p className="text-gray-700 mb-1">{business.contact_info}</p>
              {business.email && <p className="text-gray-700 mb-1">{business.email}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {["Facebook", "Instagram", "Foodpanda", "Grab"].map((label) => (
                  <span key={label} className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Menu */}
          <section className="bg-white border border-gray-300 rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold">Menu</h2>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryType)}
                className="border border-gray-300 p-2 rounded-lg shadow-sm"
              >
                <option value="all">All</option>
                <option value="Meals">Meals</option>
                <option value="Beverage">Beverage</option>
                <option value="Solo">Solo</option>
                <option value="Extras">Extras</option>
                <option value="Dessert">Dessert</option>
              </select>
            </div>
            {filteredItems.length ? (
              <MenuGrid
                items={filteredItems}
                onAddToCart={handleAddToCart}
                onViewItem={setViewItem}
                isDineIn={isDineIn}
              />
            ) : (
              <p className="text-gray-500">No items available in this category.</p>
            )}
          </section>
        </main>
      </div>

      {/* Floating Orders Button */}
      <OrdersButton
        cartItems={cartItems}
        cartTotal={cartTotal}
        orderStatus={orderStatus}
        isDineIn={isDineIn}
        submittingOrder={submittingOrder}
        onSubmitOrder={handleSubmitOrder}
        onRemoveItem={handleRemoveFromCart}
        badgeCount={cartItems.length}
        currentOrder={currentOrder}
      />

      {/* Item Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border-2 border-black bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#E23838] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-2xl font-bold text-white tracking-tight">{viewItem.name}</h3>
              <button
                onClick={() => setViewItem(null)}
                className="rounded-lg border border-white px-3 py-1 text-sm font-semibold text-white hover:bg-white hover:text-[#E23838] transition"
              >
                Back
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-4 p-6">
              <div className="h-44 w-full rounded-xl border-2 border-black bg-gray-100 overflow-hidden">
                {viewItem.image_url ? (
                  <img src={viewItem.image_url} alt={viewItem.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
                    No image
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-base text-[#E23838] font-bold">Description</p>
                <p className="text-gray-700 leading-relaxed">{viewItem.description || "No description available."}</p>
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-2xl font-extrabold text-[#E23838]">₱{viewItem.price}</p>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-sm text-gray-700">{viewItem.category || "Unknown"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🔥 Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[2000] animate-slide-in">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg text-white min-w-[250px]
              ${notification.type === "error" ? "bg-red-500" : "bg-green-500"}
            `}
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

      {orderCompleteModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#E23838] px-6 py-5">
              <h2 className="text-2xl font-bold text-white">Order Complete</h2>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-gray-700 text-lg font-semibold">Thank you for ordering!</p>
              <p className="text-gray-600">
                Your order is complete and has been successfully delivered. You can close this message or place another order.
              </p>
              {completedOrder && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm uppercase tracking-wider text-gray-500">Order ID</p>
                    <p className="font-semibold text-gray-800">{completedOrder.id.slice(0, 8)}...</p>
                  </div>
                  <div className="space-y-2">
                    {completedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm text-gray-700">
                        <span>{item.name}</span>
                        <span className="font-semibold text-[#E23838]">₱{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-lg font-bold text-[#E23838]">₱{completedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={closeOrderCompleteModal}
                  className="w-full rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={closeOrderCompleteModal}
                  className="w-full rounded-2xl bg-[#E23838] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c22f2f] transition"
                >
                  Order Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}