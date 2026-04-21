"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";
import ReceiptModal, { DailySale, OrderReceipt } from "@/components/ReceiptModal";

export default function BusinessReportsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [weeklyData, setWeeklyData] = useState<DailySale[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailySale | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<OrderReceipt[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);

      if (!sess?.user) return router.push("/");

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", sess.user.id)
        .single();

      if (userError) {
        console.error("Error loading user role:", userError.message);
        return router.push("/");
      }

      if (user?.role !== "owner") return router.push("/");

      setSession(sess);

      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", sess.user.id)
        .single();

      if (bizError) {
        console.error("Error loading business:", bizError.message);
        return;
      }

      if (biz?.id) setBusinessId(biz.id);
    };

    init();
  }, [router]);

  // 🔥 FIXED WEEKLY REPORT LOGIC
  const fetchWeekly = async (bizId: string) => {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 6);

    const { data, error } = await supabase
      .from("daily_sales")
      .select("*")
      .eq("business_id", bizId)
      .gte("date", past7.toISOString().split("T")[0])
      .lte("date", today.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      setWeeklyData([]);
      return;
    }

    setWeeklyData(data || []);
  };

  useEffect(() => {
    if (!businessId) return;
    fetchWeekly(businessId);
  }, [businessId]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const fetchOrdersForDay = async (date: string) => {
    if (!businessId) return;

    setLoadingOrders(true);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        items,
        total_amount,
        created_at,
        table:table_id (
          table_number
        )
      `)
      .eq("business_id", businessId)
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading completed orders:", error.message);
      setSelectedOrders([]);
    } else {
      const normalized = (data || []).map((order: any) => ({
        ...order,
        table:
          Array.isArray(order.table) && order.table.length > 0
            ? order.table[0]
            : order.table || null,
      })) as OrderReceipt[];

      setSelectedOrders(normalized);
    }

    setLoadingOrders(false);
  };

  const openReceipt = async (day: DailySale) => {
    setSelectedDay(day);
    await fetchOrdersForDay(day.date);
  };

  if (!authChecked || !session) {
    return <div className="p-10">Loading...</div>;
  }

  const totalSales = weeklyData.reduce((sum, day) => sum + Number(day.total_sales || 0), 0);
  const totalOrders = weeklyData.reduce((sum, day) => sum + (day.total_orders || 0), 0);

  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr] gap-8 px-4 py-8">
        <BusinessSidebar />

        <main className="space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                  Business Reports
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Weekly Sales</h1>
              </div>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                Last 7 days
              </div>
            </div>
          </div>

          {weeklyData.length > 0 ? (
            <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Daily Sales</h2>
                  <p className="text-sm text-slate-500">Click on a day to view detailed orders</p>
                </div>

                <div className="space-y-3">
                  {weeklyData.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => openReceipt(day)}
                      className="w-full grid grid-cols-3 items-center gap-4 p-4 border border-slate-200 rounded-[24px] bg-white hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatDate(day.date)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-900">
                          {day.total_orders}
                        </p>
                        <p className="text-xs text-slate-500">orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#E23838]">
                          ₱{Number(day.total_sales).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Overview</h3>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">Total Sales</p>
                      <p className="mt-1 text-2xl font-bold text-[#E23838]">₱{totalSales.toFixed(2)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">Total Orders</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{totalOrders}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">Avg per Order</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        ₱{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm text-center">
              <p className="text-slate-500">No sales data yet</p>
              <p className="text-sm text-slate-400 mt-2">Sales data will appear here once orders are completed</p>
            </div>
          )}

          {selectedDay && (
            <ReceiptModal
              selectedDay={selectedDay}
              selectedOrders={selectedOrders}
              loadingOrders={loadingOrders}
              onClose={() => {
                setSelectedDay(null);
                setSelectedOrders([]);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}