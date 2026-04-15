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

  return (
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        <BusinessSidebar />

        <main className="p-8 bg-white">
          <h1 className="text-3xl font-bold mb-2">Weekly Reports</h1>
          <p className="text-gray-500 mb-6">Sales overview for the last 7 days</p>

          {weeklyData.length > 0 ? (
            <div className="space-y-3">
              {weeklyData.map((day) => (
                <button
                  key={day.id}
                  onClick={() => openReceipt(day)}
                  className="w-full text-left grid grid-cols-3 items-center p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition"
                >
                  <div className="font-semibold text-gray-800">
                    {formatDate(day.date)}
                  </div>

                  <div className="text-gray-600">
                    {day.total_orders} orders
                  </div>

                  <div className="text-right font-bold text-[#E23838]">
                    ₱{Number(day.total_sales).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border">
              <p className="text-gray-500">No sales data yet</p>
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