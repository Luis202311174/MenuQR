"use client";

import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import PageShell from "@/components/PageShell";

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
    let retryCount = 0;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sess = data.session;

        setAuthChecked(true);

        if (!sess?.user) {
          if (retryCount < 2) {
            retryCount += 1;
            retryHandle = setTimeout(init, 500);
            return;
          }

          router.push("/login");
          return;
        }

        const { data: user, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", sess.user.id)
          .single();

        if (userError) {
          console.error("Error loading user role:", userError);
          return;
        }

        if (user?.role !== "owner") {
          router.push("/");
          return;
        }

        setSession(sess);

        const { data: bizData, error: bizError } = await supabase
          .from("businesses")
          .select("id, name, address, contact_info, slug")
          .eq("owner_id", sess.user.id)
          .single();

        if (bizError || !bizData) {
          console.error("Error loading business:", bizError);
          return;
        }

        setBusinessId(bizData.id);
        setBusinessData(bizData);
      } catch (error) {
        console.error("Error checking supabase session:", error);
        setAuthChecked(true);

        if (retryCount < 2) {
          retryCount += 1;
          retryHandle = setTimeout(init, 500);
          return;
        }

        router.push("/login");
      }
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

      <PageShell
        title="Business Dashboard"
        subtitle="Track your business performance and insights"
      >
        {!authChecked || !session ? (
          <div className="flex items-center justify-center h-screen">
            <p className="text-lg text-gray-600">Loading dashboard…</p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto px-0 py-0 sm:py-0">

            <div className="space-y-8">
              {/* HEADER */}
              <div className="rounded-[28px] border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-semibold text-slate-500 mb-2">
                      Welcome back
                    </p>
                    <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
                      {businessData?.name || "Business"}
                    </h1>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                    <div>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-[0.2em]">Address</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[260px]">
                        {businessData?.address || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-[0.2em]">Contact</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                        {businessData?.contact_info || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS SECTION */}
              <section className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold text-slate-500">Overview</p>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                    Dashboard Metrics
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 sm:p-4 shadow-sm hover:shadow-md transition min-h-[140px]">
                    <p className="text-[10px] sm:text-[11px] font-medium text-white/80">
                      Total Menu Items
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-3">
                      {menuCount}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-white/60 mt-2 font-medium">Items in your menu</p>
                  </div>

                  <div className="rounded-[24px] bg-gradient-to-br from-blue-200 to-blue-400 text-slate-900 p-3 sm:p-4 shadow-sm hover:shadow-md transition min-h-[140px]">
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-700">
                      Active Orders
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-3">
                      {activeOrdersCount}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-slate-600 mt-2 font-medium">Waiting for you</p>
                  </div>

                  <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 sm:p-4 shadow-sm hover:shadow-md transition min-h-[140px]">
                    <p className="text-[10px] sm:text-[11px] font-medium text-white/80">
                      Completed Orders
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-3">
                      {completedOrdersCount}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-white/60 mt-2 font-medium">This month</p>
                  </div>

                  <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 sm:p-4 shadow-sm hover:shadow-md transition min-h-[140px]">
                    <p className="text-[10px] sm:text-[11px] font-medium text-white/80">
                      Today's Orders
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-3">
                      {dailyOrdersCount}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-white/60 mt-2 font-medium">Received today</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <a
                    href="/business/menu"
                    className="rounded-[20px] bg-blue-600 text-white font-semibold text-sm px-4 py-3 text-center hover:bg-blue-700 transition shadow-sm"
                  >
                    Manage Menu
                  </a>

                  <a
                    href="/business/orders"
                    className="rounded-[20px] bg-blue-200 text-slate-900 font-semibold text-sm px-4 py-3 text-center hover:bg-blue-300 transition shadow-sm"
                  >
                    View Orders
                  </a>

                  <a
                    href="/business/reports"
                    className="rounded-[20px] bg-blue-600 text-white font-semibold text-sm px-4 py-3 text-center hover:bg-blue-700 transition shadow-sm"
                  >
                    View Reports
                  </a>

                  <a
                    href={businessData?.slug ? '/' + businessData.slug : '/'}
                    className="rounded-[20px] bg-slate-700 text-white font-semibold text-sm px-4 py-3 text-center hover:bg-slate-800 transition shadow-sm"
                  >
                    Preview Menu
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}