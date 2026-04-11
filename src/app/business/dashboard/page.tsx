"use client";

import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessData, setBusinessData] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [menuCount, setMenuCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);

  /* =========================
     AUTH + BUSINESS INIT
  ========================= */
  useEffect(() => {
    let retryHandle: NodeJS.Timeout | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);

      if (!sess?.user) {
        if (!retryHandle) retryHandle = setTimeout(init, 500);
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", sess.user.id)
        .single();

      if (user?.role !== "owner") {
        router.push("/");
        return;
      }

      setSession(sess);

      const { data: bizData, error } = await supabase
        .from("businesses")
        .select("id, name, address, contact_info")
        .eq("owner_id", sess.user.id)
        .single();

      if (error || !bizData) {
        console.error(error);
        return;
      }

      setBusinessId(bizData.id);
      setBusinessData(bizData);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") router.push("/");
        if (event === "SIGNED_IN" && session?.user) init();
      }
    );

    init();

    return () => {
      listener.subscription.unsubscribe();
      if (retryHandle) clearTimeout(retryHandle);
    };
  }, [router]);

  /* =========================
     FETCH DASHBOARD STATS
  ========================= */
  useEffect(() => {
    if (!businessId) return;

    const fetchStats = async () => {
      // MENU COUNT
      const { count: menuTotal } = await supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId);

      // ACTIVE ORDERS
      const { count: activeTotal } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["pending", "order_received", "order_ready"])

      // COMPLETED
      const { count: completedTotal } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["completed", "cancelled"]);

      setMenuCount(menuTotal || 0);
      setActiveOrdersCount(activeTotal || 0);
      setCompletedOrdersCount(completedTotal || 0);
    };

    fetchStats();
  }, [businessId]);

  /* =========================
     UI
  ========================= */
  return (
    <>
      <Head>
        <title>MenuQR Business Dashboard</title>
      </Head>

      <div className="min-h-screen bg-[#FCFBF4]">
        {!authChecked || !session ? (
          <div className="flex items-center justify-center h-screen">
            <p className="text-lg text-gray-600">Loading dashboard…</p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
              
              {/* SIDEBAR */}
              <BusinessSidebar />

              {/* MAIN */}
              <main className="p-8 bg-white min-h-screen">
                
                {/* HEADER */}
                <header className="mb-10">
                  <h1 className="text-4xl font-bold">
                    {businessData?.name || "Business"}
                  </h1>
                  <p className="text-gray-600 mt-1 text-lg">
                    {businessData?.address}
                  </p>
                  <p className="text-gray-600 text-base">
                    {businessData?.contact_info}
                  </p>
                </header>

                {/* STATS */}
                <section className="space-y-8">
                  <h2 className="text-2xl font-bold">
                    Dashboard Overview
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div className="bg-gradient-to-br from-[#E23838] to-[#c22f2f] text-white p-6 rounded-lg shadow-md">
                      <p className="text-sm font-semibold text-white/80">
                        Total Menu Items
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {menuCount}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#F2FF00] to-[#d4cc00] text-[#333] p-6 rounded-lg shadow-md">
                      <p className="text-sm font-semibold">
                        Active Orders
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {activeOrdersCount}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-md">
                      <p className="text-sm font-semibold text-white/80">
                        Completed Orders
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {completedOrdersCount}
                      </p>
                    </div>

                  </div>

                  {/* QUICK NAV */}
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold mb-4">
                      Quick Actions
                    </h3>

                    <div className="flex flex-wrap gap-4">
                      <a
                        href="/business/menu"
                        className="bg-[#E23838] text-[#F2FF00] font-bold px-6 py-3 rounded-lg hover:opacity-90 transition"
                      >
                        Manage Menu
                      </a>

                      <a
                        href="/business/orders"
                        className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg hover:opacity-90 transition"
                      >
                        View Orders
                      </a>

                      <a
                        href="/business/reports"
                        className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition"
                      >
                        View Reports
                      </a>

                      <a
                        href="/business/preview"
                        className="bg-gray-600 text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition"
                      >
                        Preview Menu
                      </a>
                    </div>
                  </div>

                </section>

              </main>
            </div>
          </div>
        )}
      </div>
    </>
  );
}