"use client";

import Head from "next/head";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUtensils,
  faReceipt,
  faCircleCheck,
  faBoxOpen,
  faEye,
  faClipboardList,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import PageShell from "@/components/PageShell";

export default function BusinessDashboardPage() {
  const auth = useBusinessAuth("dashboard", "view");

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
    if (!auth.checked) return;

    const init = async () => {
      if (auth.owner) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;

        const { data: bizData, error: bizError } = await supabase
          .from("businesses")
          .select("id, name, address, contact_info, slug")
          .eq("owner_id", userId)
          .single();

        if (!bizError && bizData) {
          setBusinessId(bizData.id);
          setBusinessData(bizData);
        }
      }

      if (auth.staffSession) {
        const staff = auth.staffSession;
        setBusinessId(staff.businessId);

        // Fetch full business info for staff (staff isn't linked via owner_id).
        const { data: bizData, error: bizError } = await supabase
          .from("businesses")
          .select("id, name, address, contact_info, slug")
          .eq("id", staff.businessId)
          .single();

        if (!bizError && bizData) {
          setBusinessData(bizData);
        } else {
          // Fallback so UI doesn't hang.
          setBusinessData((prev: any) =>
            prev ?? {
              id: staff.businessId,
              name: prev?.name ?? "Business",
            }
          );
        }
      }

    };

    init();
  }, [auth]);

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
        {!auth.checked || !businessData ? (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* TOTAL MENU */}
                <div className="rounded-[24px] border-2 border-blue-500 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md min-h-[140px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Total Menu Items
                      </p>

                      <p className="mt-4 text-3xl font-black text-slate-900">
                        {menuCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <FontAwesomeIcon icon={faUtensils} className="text-lg" />
                    </div>
                  </div>

                  <p className="mt-5 text-[10px] font-medium text-slate-500">
                    Items currently listed
                  </p>
                </div>

                {/* ACTIVE ORDERS */}
                <div className="rounded-[24px] border-2 border-amber-500 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md min-h-[140px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Active Orders
                      </p>

                      <p className="mt-4 text-3xl font-black text-slate-900">
                        {activeOrdersCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                      <FontAwesomeIcon icon={faReceipt} className="text-lg" />
                    </div>
                  </div>

                  <p className="mt-5 text-[10px] font-medium text-slate-500">
                    Orders awaiting action
                  </p>
                </div>

                {/* COMPLETED */}
                <div className="rounded-[24px] border-2 border-emerald-500 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md min-h-[140px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Completed Orders
                      </p>

                      <p className="mt-4 text-3xl font-black text-slate-900">
                        {completedOrdersCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-lg" />
                    </div>
                  </div>

                  <p className="mt-5 text-[10px] font-medium text-slate-500">
                    Successfully fulfilled
                  </p>
                </div>

                {/* TODAY */}
                <div className="rounded-[24px] border-2 border-rose-500 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md min-h-[140px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Today's Orders
                      </p>

                      <p className="mt-4 text-3xl font-black text-slate-900">
                        {dailyOrdersCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                      <FontAwesomeIcon icon={faBoxOpen} className="text-lg" />
                    </div>
                  </div>

                  <p className="mt-5 text-[10px] font-medium text-slate-500">
                    Orders received today
                  </p>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm mt-12">
                <div className="mb-6">
                  <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                    Actions
                  </p>

                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    Quick Access
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                  {/* MANAGE MENU */}
                  <a
                    href="/business/menu"
                    className="group rounded-[24px] border-2 border-blue-500 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Menu
                        </p>

                        <h4 className="mt-3 text-lg font-bold text-slate-900">
                          Manage Menu
                        </h4>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <FontAwesomeIcon icon={faUtensils} className="text-lg" />
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-slate-500">
                      Add, edit and organize your menu items.
                    </p>
                  </a>

                  {/* VIEW ORDERS */}
                  <a
                    href="/business/orders"
                    className="group rounded-[24px] border-2 border-amber-500 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Orders
                        </p>

                        <h4 className="mt-3 text-lg font-bold text-slate-900">
                          View Orders
                        </h4>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                        <FontAwesomeIcon icon={faClipboardList} className="text-lg" />
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-slate-500">
                      Monitor incoming and active customer orders.
                    </p>
                  </a>

                  {/* REPORTS */}
                  <a
                    href="/business/reports"
                    className="group rounded-[24px] border-2 border-emerald-500 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reports
                        </p>

                        <h4 className="mt-3 text-lg font-bold text-slate-900">
                          View Reports
                        </h4>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <FontAwesomeIcon icon={faChartLine} className="text-lg" />
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-slate-500">
                      Analyze sales and business performance insights.
                    </p>
                  </a>

                  {/* PREVIEW */}
                  <a
                    href={businessData?.slug ? "/" + businessData.slug : "/"}
                    className="group rounded-[24px] border-2 border-slate-500 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Preview
                        </p>

                        <h4 className="mt-3 text-lg font-bold text-slate-900">
                          Preview Menu
                        </h4>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <FontAwesomeIcon icon={faEye} className="text-lg" />
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-slate-500">
                      Open your public menu page as customers see it.
                    </p>
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