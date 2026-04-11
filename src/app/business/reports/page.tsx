"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

export default function BusinessReportsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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

  // =========================
  // AUTH + BUSINESS
  // =========================
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

      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", sess.user.id)
        .single();

      if (biz) setBusinessId(biz.id);
    };

    init();
  }, [router]);

  // =========================
  // FETCH ARCHIVED ORDERS
  // =========================
  const fetchArchivedOrders = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["completed", "cancelled"])
      .order("created_at", { ascending: false });

    setArchivedOrders(data || []);
  };

  useEffect(() => {
    if (!businessId) return;

    fetchArchivedOrders();
  }, [businessId]);

  // =========================
  // UI
  // =========================
  if (!authChecked || !session) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        
        {/* SIDEBAR */}
        <BusinessSidebar />

        {/* CONTENT */}
        <main className="p-8 bg-white">
          <h1 className="text-3xl font-bold mb-6">Reports (Archived Orders)</h1>

          {archivedOrders.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-sm font-semibold text-gray-700">
                <span className="col-span-3">Order ID</span>
                <span className="col-span-3">Date</span>
                <span className="col-span-2">Total</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2 text-right">Action</span>
              </div>
              {archivedOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm text-gray-700 border-b border-gray-100 hover:bg-gray-50"
                >
                  <span className="col-span-3 font-medium">{order.id.slice(0, 8)}...</span>
                  <span className="col-span-3">{new Date(order.created_at).toLocaleString()}</span>
                  <span className="col-span-2 font-semibold text-[#E23838]">₱{Number(order.total_amount).toFixed(2)}</span>
                  <span className="col-span-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${order.status === "completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {displayStatusLabel(order.status)}
                    </span>
                  </span>
                  <span className="col-span-2 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg bg-[#E23838] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c22f2f] transition"
                    >
                      View Details
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-gray-200">
              <p className="text-gray-500 text-lg">
                No archived orders yet
              </p>
            </div>
          )}

          {selectedOrder && (
            <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                <div className="bg-[#E23838] px-6 py-4">
                  <h2 className="text-2xl font-bold text-white">Order Details</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap gap-4">
                    <div className="w-full sm:w-1/2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Order ID</p>
                      <p className="mt-1 font-semibold">{selectedOrder.id}</p>
                    </div>
                    <div className="w-full sm:w-1/2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
                      <p className="mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    <div className="w-full sm:w-1/2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                      <p className="mt-1 font-semibold text-[#E23838]">₱{Number(selectedOrder.total_amount).toFixed(2)}</p>
                    </div>
                    <div className="w-full sm:w-1/2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                      <p className="mt-1 font-semibold">{displayStatusLabel(selectedOrder.status)}</p>
                    </div>
                    {selectedOrder.table?.table_number && (
                      <div className="w-full sm:w-1/2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Table</p>
                        <p className="mt-1">{selectedOrder.table.table_number}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="font-semibold mb-3">Items</h3>
                    <div className="space-y-2">
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-700">
                          <span>{item.name}</span>
                          <span>₱{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}