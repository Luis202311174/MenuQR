"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import MenuGrid from "@/components/MenuGrid";
import SlugSidebar from "@/components/SlugSidebar";
import BusinessHeader from "@/components/business/BusinessHeader";
import OrdersButton from "@/components/OrdersButton";
import { loadBusinessPageData } from "@/utils/loadBusinessPageData";
import { fetchActiveOrderByTable, fetchUnpaidOrdersBySession, fetchAllOrdersBySession, OrderData } from "@/utils/fetchActiveOrder";
import { createOrder } from "@/utils/createOrder";
import { endTableSession } from "@/utils/endTableSession";
import { supabase } from "@/lib/supabaseClient";
import { trackBusinessViewOnce } from "@/utils/trackBusinessView";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
};

type Business = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  contact_info?: string;
  email?: string;
  logo_url?: string;
  store_hours?: string;
  store_category?: string;
  qr_code_url?: string;
  fb?: string;
  ig?: string;
  fp?: string;
  gr?: string;
  socials?: {
    fb?: string;
    ig?: string;
    fp?: string;
    gr?: string;
  };
  cash_enabled?: boolean;
  gcash_enabled?: boolean;
};

export default function BusinessPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionOrders, setSessionOrders] = useState<OrderData[]>([]); // New: All orders in session
  const [unpaidOrders, setUnpaidOrders] = useState<OrderData[]>([]); // New: Unpaid orders in session
  const [viewItem, setViewItem] = useState<any>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [orderCompleteModal, setOrderCompleteModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [tableInvalid, setTableInvalid] = useState(false);
  const [showOrderMoreModal, setShowOrderMoreModal] = useState(false);

  const currentOrderIdRef = useRef<string | null>(null);
  const isDineIn = !!tableId && !!sessionId && !tableInvalid;
  const orderStatus = (currentOrder?.status as string) || "none";

  const finalizePayment = async (method: "cash" | "gcash") => {
    if (!sessionId || !business) return;

    const { error } = await supabase
      .from("orders")
      .update({ is_paid: true, status: "paid", payment_method: method })
      .eq("session_id", sessionId)
      .eq("is_paid", false);

    if (error) throw error;

    const allSessionOrders = await fetchAllOrdersBySession(sessionId);
    setSessionOrders(allSessionOrders);

    const unpaidSessionOrders = await fetchUnpaidOrdersBySession(sessionId);
    setUnpaidOrders(unpaidSessionOrders);

    setNotification({ message: "Payment successful", type: "success" });
  };

  useEffect(() => {
    currentOrderIdRef.current = currentOrderId;
  }, [currentOrderId]);

  // 💾 Persist current order to sessionStorage
  useEffect(() => {
    if (currentOrder && tableId && sessionId) {
      const orderData = {
        ...currentOrder,
        tableId,
        sessionId,
      };
      sessionStorage.setItem(`order_${tableId}_${sessionId}`, JSON.stringify(orderData));
    }
  }, [currentOrder, tableId, sessionId]);

  // 🔄 Restore current order from sessionStorage on mount
  useEffect(() => {
    if (!tableId || !sessionId || currentOrder) return;
    
    const storedOrder = sessionStorage.getItem(`order_${tableId}_${sessionId}`);
    if (storedOrder) {
      try {
        const orderData = JSON.parse(storedOrder);
        setCurrentOrder(orderData);
        setCurrentOrderId(orderData.id);
        currentOrderIdRef.current = orderData.id;
      } catch (e) {
        console.error("Failed to restore order:", e);
      }
    }
  }, [tableId, sessionId]);

  useEffect(() => {
    if (!slug) return;

    const loadPage = async () => {
      const result = await loadBusinessPageData(slug as string, tableId);

      const normalizedItems = (result.menuItems || []).map((item: any) => ({
        ...item,
        description: item.description || item.menu_desc || null,
      }));

      setBusiness(result.business);
      setMenuItems(normalizedItems);
      setSessionId(result.sessionId);
      setTableInvalid(result.tableInvalid);

      if (result.notification) {
        setNotification(result.notification);
      }
    };

    loadPage();
  }, [slug, tableId]);

  

  useEffect(() => {
    if (!business?.id) return;

    trackBusinessViewOnce(business.id);
  }, [business?.id]);

  useEffect(() => {
    if (!sessionId || !tableId) return;

    const loadOrders = async () => {
      try {
        // Load current active order
        const activeOrder = await fetchActiveOrderByTable(tableId);
        if (activeOrder) {
          setCurrentOrder(activeOrder);
          setCurrentOrderId(activeOrder.id);
        }

        // Load all session orders - only if sessionId is valid
        if (sessionId) {
          const allSessionOrders = await fetchAllOrdersBySession(sessionId);
          setSessionOrders(allSessionOrders);

          // Load unpaid orders
          const unpaidSessionOrders = await fetchUnpaidOrdersBySession(sessionId);
          setUnpaidOrders(unpaidSessionOrders);
        }
      } catch (error: any) {
        console.error("Error loading orders:", error);
        // Continue loading even if there's an error
      }
    };

    loadOrders();
  }, [sessionId, tableId]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const filteredMenuItems = menuItems.filter((item) => {
    const categoryMatches =
      categoryFilter === "All" || item.category === categoryFilter;
    return categoryMatches && item.availability;
  });

  const orderedCategories = ["Meals", "Beverage", "Solo", "Extras", "Dessert"];

  const groupedMenuItems = filteredMenuItems.reduce((grouped, item) => {
    const category = item.category || "Other";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
    return grouped;
  }, {} as Record<string, typeof menuItems>);

  const categoryKeys = [
    ...orderedCategories.filter((cat) => groupedMenuItems[cat]),
    ...Object.keys(groupedMenuItems).filter((cat) => !orderedCategories.includes(cat)).sort(),
  ];

  const handleAddToCart = (item: any) => {
    if (!item.availability) {
      setNotification({ message: "Item is unavailable", type: "error" });
      return;
    }
    setCartItems((prev) => [...prev, item]);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!cartItems.length) return alert("Cart is empty");
    if (!business || !tableId || !sessionId) {
      setNotification({ message: "Session is not active. Please scan the table QR code again.", type: "error" });
      return;
    }

    setSubmittingOrder(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const order = await createOrder({
        businessId: business.id,
        cartItems,
        totalAmount: cartTotal,
        tableId,
        sessionId,
        userId: userId ?? undefined,
        isPaid: false, // New: Orders start as unpaid
      });

      setCurrentOrder(order as OrderData);
      setCurrentOrderId(order.id);
      setCartItems([]);
      setNotification({ message: "Order submitted successfully!", type: "success" });
      setShowOrderMoreModal(true);

      // Reload session orders - with proper error handling
      if (sessionId) {
        try {
          const allSessionOrders = await fetchAllOrdersBySession(sessionId);
          setSessionOrders(allSessionOrders);
          const unpaidSessionOrders = await fetchUnpaidOrdersBySession(sessionId);
          setUnpaidOrders(unpaidSessionOrders);
        } catch (ordersError: any) {
          console.error("Failed to reload session orders:", ordersError);
          // Don't fail the order submission if we can't reload orders
        }
      }

    } catch (error: any) {
      console.error("Submit order error:", error);
      setNotification({ message: error?.message ?? "Failed to submit order", type: "error" });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handlePayBill = async () => {
    if (!sessionId || !business) return;

    try {
      // Mark all unpaid orders as paid
      const { error } = await supabase
        .from("orders")
        .update({ is_paid: true, status: "paid" })
        .eq("session_id", sessionId)
        .eq("is_paid", false);

      if (error) throw error;

      // Reload session orders
      const allSessionOrders = await fetchAllOrdersBySession(sessionId);
      setSessionOrders(allSessionOrders);
      const unpaidSessionOrders = await fetchUnpaidOrdersBySession(sessionId);
      setUnpaidOrders(unpaidSessionOrders);

      setNotification({ message: "Payment processed successfully!", type: "success" });
      setShowOrderMoreModal(false);

    } catch (error: any) {
      console.error("Payment error:", error);
      setNotification({ message: "Failed to process payment", type: "error" });
    }
  };

  const endSessionAndExit = async () => {
    if (!sessionId || !tableId) return;

    // prevent double calls
    if (isCompleting) return;

    await endTableSession(sessionId, tableId);

    setCurrentOrder(null);
    setSessionOrders([]);
    setUnpaidOrders([]);

    router.replace(`/${slug}`);
  };

  const handleOrderCompleted = async (order: OrderData) => {
    if (isCompleting) return;

    setIsCompleting(true);
    setCompletedOrder(order);
    setCurrentOrder(order);
    setCurrentOrderId(order.id);
    setOrderCompleteModal(true);

    // ✅ END SESSION HERE (move logic from payment)
    if (sessionId && tableId) {
      await endSessionAndExit();
    }
  };

  const closeOrderCompleteModal = async () => {
    setOrderCompleteModal(false);
    setCurrentOrder(null);
    setCurrentOrderId(null);
    currentOrderIdRef.current = null;
    setCartItems([]);
    setCompletedOrder(null);
    setIsCompleting(false);
  };

  useEffect(() => {
    if (!sessionId || !tableId) return;

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
          console.log("Realtime payload:", payload);
          
          const newOrder = payload.new as OrderData;
          const oldOrder = payload.old as OrderData;

          if (payload.eventType === "DELETE") {
            if (oldOrder?.id === currentOrderIdRef.current) {
              setCurrentOrder(null);
              setCurrentOrderId(null);
              currentOrderIdRef.current = null;
            }
            // Reload session orders on any change
            fetchAllOrdersBySession(sessionId).then(setSessionOrders);
            fetchUnpaidOrdersBySession(sessionId).then(setUnpaidOrders);
            return;
          }

          if (!newOrder) return;

          // Handle cancelled orders
          if (newOrder.status === "cancelled") {
            setNotification({ 
              message: "❌ Your order has been cancelled by the restaurant", 
              type: "error" 
            });
            if (newOrder.id === currentOrderIdRef.current) {
              setCurrentOrder(null);
              setCurrentOrderId(null);
              currentOrderIdRef.current = null;
              setShowOrderMoreModal(false);
            }
            // Remove from session orders
            fetchAllOrdersBySession(sessionId).then(setSessionOrders);
            fetchUnpaidOrdersBySession(sessionId).then(setUnpaidOrders);
            return;
          }

          if (["pending", "received", "ready", "paid"].includes(newOrder.status)) {
            setCurrentOrder(newOrder);
            setCurrentOrderId(newOrder.id);
            currentOrderIdRef.current = newOrder.id;
          }

          if (newOrder.status === "served" && newOrder.id === currentOrderIdRef.current) {
            handleOrderCompleted(newOrder);
          }

          // Reload session orders on any change
          fetchAllOrdersBySession(sessionId).then(setSessionOrders);
          fetchUnpaidOrdersBySession(sessionId).then(setUnpaidOrders);
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [sessionId, tableId]);

  if (!business) return <div className="p-6 text-center">Loading...</div>;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL;
  const qrUrl =
    business.qr_code_url ||
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      `${baseUrl}/${slug}${tableId ? `?table=${tableId}` : ""}`
    )}`;

  return (
    <div className="min-h-screen bg-[#FCFBF4] px-4 py-6 sm:px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <SlugSidebar
          qrUrl={qrUrl}
          tableId={tableId}
          currentOrder={currentOrder}
          orderStatus={orderStatus}
          cartItems={cartItems}
          cartTotal={cartTotal}
        />

        <main className="space-y-6">
          <BusinessHeader business={business} />

          <section className="bg-white border border-gray-300 rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold">Menu</h2>

              <div className="w-full max-w-xs">
                <label className="block text-sm text-gray-700">
                  Category
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E23838]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Meals">Meals</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Solo">Solo</option>
                    <option value="Extras">Extras</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </label>
              </div>
            </div>

            {filteredMenuItems.length > 0 ? (
              <div className="space-y-8">
                {categoryKeys.map((category) => {
                  const items = groupedMenuItems[category];
                  return (
                    <div key={category}>
                      <div className="mb-4 pb-3 border-b border-gray-300">
                        <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <MenuGrid
                        items={items}
                        onAddToCart={handleAddToCart}
                        viewItem={viewItem}
                        setViewItem={setViewItem}
                        isDineIn={isDineIn}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                {menuItems.length > 0 ? (
                  <p>No items match the selected filters.</p>
                ) : (
                  <p>No items available. Check back soon!</p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

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
        sessionOrders={sessionOrders}
        unpaidOrders={unpaidOrders}
        paymentSettings={{
          cash: business?.cash_enabled ?? false,
          gcash: business?.gcash_enabled ?? false,
        }}
        sessionId={sessionId!}
        businessId={business!.id}
        tableId={tableId!}
        onPayBill={handlePayBill}
        showOrderMoreModal={showOrderMoreModal}
        orderCompleteModal={orderCompleteModal}
        onPaymentComplete={finalizePayment}
        completedOrder={completedOrder}
        onCloseOrderCompleteModal={closeOrderCompleteModal}
        onCloseOrderMoreModal={() => setShowOrderMoreModal(false)}
      />

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
    </div>
  );
}