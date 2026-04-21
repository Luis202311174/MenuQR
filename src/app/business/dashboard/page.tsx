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
  const [dailyOrdersCount, setDailyOrdersCount] = useState(0);

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
        .select("id, name, address, contact_info, slug")
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

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // ACTIVE ORDERS
      const { count: activeTotal } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["pending", "received", "ready"]);

      // COMPLETED
      const { count: completedTotal } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "completed");

      // TODAY'S ORDERS
      const { count: dailyTotal } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      setMenuCount(menuTotal || 0);
      setActiveOrdersCount(activeTotal || 0);
      setCompletedOrdersCount(completedTotal || 0);
      setDailyOrdersCount(dailyTotal || 0);
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

      <div className="min-h-screen bg-[#F4F3ED]">
        {!authChecked || !session ? (
          <div className="flex items-center justify-center h-screen">
            <p className="text-lg text-gray-600">Loading dashboard…</p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 px-4 py-8">
              
              {/* SIDEBAR */}
              <BusinessSidebar />

              {/* MAIN */}
              <main className="p-8 bg-white min-h-screen space-y-8">
                
                {/* HEADER */}
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.3em] font-semibold text-slate-500 mb-2">
                        Welcome back
                      </p>
                      <h1 className="text-3xl font-bold text-slate-900 truncate">
                        {businessData?.name || "Business"}
                      </h1>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Address</p>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[260px]">
                          {businessData?.address || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Contact</p>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                          {businessData?.contact_info || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATS SECTION */}
                <section className="space-y-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Overview</p>
                    <h2 className="text-2xl font-bold text-slate-900 mt-2">
                      Dashboard Metrics
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    <div className="rounded-[24px] bg-gradient-to-br from-[#E23838] to-[#c22f2f] text-white p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-sm font-medium text-white/80">
                        Total Menu Items
                      </p>
                      <p className="text-5xl font-black mt-4">
                        {menuCount}
                      </p>
                      <p className="text-xs text-white/60 mt-3 font-medium">Items in your menu</p>
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-[#F2FF00] to-[#d4cc00] text-slate-900 p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-sm font-medium text-slate-700">
                        Active Orders
                      </p>
                      <p className="text-5xl font-black mt-4">
                        {activeOrdersCount}
                      </p>
                      <p className="text-xs text-slate-600 mt-3 font-medium">Waiting for you</p>
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-sm font-medium text-white/80">
                        Completed Orders
                      </p>
                      <p className="text-5xl font-black mt-4">
                        {completedOrdersCount}
                      </p>
                      <p className="text-xs text-white/60 mt-3 font-medium">This month</p>
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-8 shadow-sm hover:shadow-md transition">
                      <p className="text-sm font-medium text-white/80">
                        Today's Orders
                      </p>
                      <p className="text-5xl font-black mt-4">
                        {dailyOrdersCount}
                      </p>
                      <p className="text-xs text-white/60 mt-3 font-medium">Received today</p>
                    </div>

                  </div>
                </section>

                {/* QUICK ACTIONS */}
                <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm mt-12">
                  <div className="mb-6">
                    <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Actions</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">
                      Quick Access
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a
                      href="/business/menu"
                      className="rounded-[20px] bg-[#E23838] text-[#F2FF00] font-bold px-6 py-4 text-center hover:bg-[#c22f2f] transition transform hover:scale-105 shadow-sm"
                    >
                      Manage Menu
                    </a>

                    <a
                      href="/business/orders"
                      className="rounded-[20px] bg-[#F2FF00] text-slate-900 font-bold px-6 py-4 text-center hover:bg-[#d4cc00] transition transform hover:scale-105 shadow-sm"
                    >
                      View Orders
                    </a>

                    <a
                      href="/business/reports"
                      className="rounded-[20px] bg-blue-600 text-white font-bold px-6 py-4 text-center hover:bg-blue-700 transition transform hover:scale-105 shadow-sm"
                    >
                      View Reports
                    </a>

                    <a
                      href={businessData?.slug ? '/' + businessData.slug : '/'}
                      className="rounded-[20px] bg-slate-700 text-white font-bold px-6 py-4 text-center hover:bg-slate-800 transition transform hover:scale-105 shadow-sm"
                    >
                      Preview Menu
                    </a>
                  </div>
                </div>

              </main>
            </div>
        )}
      </div>
    </>
  );
}