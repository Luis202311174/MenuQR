"use client";

import Head from "next/head";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import jsPDF from "jspdf";
import ReceiptModal, { DailySale, OrderReceipt } from "@/components/ReceiptModal";

type ChartPoint = DailySale & { x: number; y: number; value: number };

export default function BusinessReportsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessData, setBusinessData] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [ordersCount, setOrdersCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [weeklyData, setWeeklyData] = useState<DailySale[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailySale | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<OrderReceipt[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [ordersInRange, setOrdersInRange] = useState<any[]>([]);

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
      setBusinessName(bizData.name || "");
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

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  /* =========================
     FETCH WEEKLY SALES DATA
  ========================= */
  useEffect(() => {
    if (!businessId) return;
    fetchWeekly(businessId);
  }, [businessId]);

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

  /* =========================
     FETCH ORDERS IN RANGE
  ========================= */
  useEffect(() => {
    if (!businessId) return;
    fetchOrdersInRange();
  }, [businessId, filterStart, filterEnd, weeklyData]);

  const fetchOrdersInRange = async () => {
    if (!businessId) return;

    const startDate = filterStart || weeklyData[0]?.date;
    const endDate = filterEnd || weeklyData[weeklyData.length - 1]?.date;
    if (!startDate || !endDate) {
      setOrdersInRange([]);
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading orders for selected range:", error.message);
      setOrdersInRange([]);
      return;
    }

    setOrdersInRange(data || []);
  };

  /* =========================
     UTILITY FUNCTIONS
  ========================= */
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  /* =========================
     COMPUTED VALUES FOR REPORTS
  ========================= */
  const filteredWeeklyData = useMemo(() => {
    return weeklyData
      .filter((day) => {
        if (filterStart && day.date < filterStart) return false;
        if (filterEnd && day.date > filterEnd) return false;
        return true;
      })
      .sort((a, b) =>
        sortAscending
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date)
      );
  }, [weeklyData, filterStart, filterEnd, sortAscending]);

  const quickReportTotals = useMemo(() => {
    return {
      totalSales: filteredWeeklyData.reduce(
        (sum, day) => sum + Number(day.total_sales || 0),
        0
      ),
      totalOrders: filteredWeeklyData.reduce(
        (sum, day) => sum + Number(day.total_orders || 0),
        0
      ),
    };
  }, [filteredWeeklyData]);

  const orderCountsByHour = useMemo(() => {
    const counts: Record<string, number> = {};
    ordersInRange.forEach((order) => {
      const created = new Date(order.created_at);
      const dateKey = created.toISOString().split("T")[0];
      const hour = created.getHours();
      const key = `${dateKey}-${hour}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [ordersInRange]);

  const selectedHourTotals = useMemo(() => {
    if (selectedHour === null) return null;
    return filteredWeeklyData.reduce((sum, day) => {
      const key = `${day.date}-${selectedHour}`;
      return sum + (orderCountsByHour[key] || 0);
    }, 0);
  }, [filteredWeeklyData, orderCountsByHour, selectedHour]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (filteredWeeklyData.length === 0) return [];

    const values = filteredWeeklyData.map((day) => {
      if (selectedHour !== null) {
        const key = `${day.date}-${selectedHour}`;
        return orderCountsByHour[key] || 0;
      }
      return Number(day.total_sales || 0);
    });

    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const width = 520;
    const height = 160;

    return filteredWeeklyData.map((day, index) => {
      const rawValue = values[index];
      const x = 40 + (index * width) / Math.max(filteredWeeklyData.length - 1, 1);
      const ratio = maxValue === minValue ? 0.5 : (rawValue - minValue) / (maxValue - minValue);
      const y = 220 - ratio * height;
      return {
        ...day,
        x,
        y,
        value: rawValue,
      };
    });
  }, [filteredWeeklyData, orderCountsByHour, selectedHour]);

  /* =========================
     FUNCTIONS
  ========================= */
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
        items: (order.items || []).map((item: any) => ({
          ...item,
          quantity: item.quantity ?? item.qty ?? 1,
          base_price: item.base_price ?? item.price ?? 0,
          selected_options:
            item.selected_options ??
            item.selectedOptions ??
            [],
        })),
      })) as OrderReceipt[];
      setSelectedOrders(normalized);
    }

    setLoadingOrders(false);
  };

  const openReceipt = async (day: DailySale) => {
    if (selectedDay?.id === day.id) {
      setSelectedDay(null);
      setSelectedOrders([]);
      return;
    }
    setSelectedDay(day);
    await fetchOrdersForDay(day.date);
  };

  const downloadSalesPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    doc.setFontSize(18);
    doc.text(businessName || "Business Report", 40, 40);
    doc.setFontSize(14);
    doc.text("Quick Report Overview", 40, 60);
    doc.setFontSize(11);
    doc.text(
      `Date Range: ${filterStart || "all"} — ${filterEnd || "all"}`,
      40,
      80
    );
    doc.text(`Hour: ${selectedHour !== null ? formatHour(selectedHour) : "All day"}`, 40, 96);
    doc.text(`Total Sales: ₱${quickReportTotals.totalSales.toFixed(2)}`, 40, 112);
    doc.text(`Total Orders: ${quickReportTotals.totalOrders}`, 40, 128);

    if (chartPoints.length > 1) {
      const chartX = 40;
      const chartY = 150;
      const chartWidth = 520;
      const chartHeight = 120;
      doc.setDrawColor(230);
      doc.rect(chartX, chartY, chartWidth, chartHeight);
      doc.setDrawColor(226, 56, 56);
      let previousPoint: { x: number; y: number } | null = null;
      chartPoints.forEach((point, index) => {
        const x = chartX + (index * chartWidth) / Math.max(chartPoints.length - 1, 1);
        const y = chartY + chartHeight -
          ((point.value - Math.min(...chartPoints.map((p) => p.value))) /
            Math.max(
              Math.max(...chartPoints.map((p) => p.value)) - Math.min(...chartPoints.map((p) => p.value)),
              1
            )) * chartHeight;
        if (previousPoint) {
          doc.line(previousPoint.x, previousPoint.y, x, y);
        }
        doc.circle(x, y, 2, "F");
        previousPoint = { x, y };
      });
    }

    let yPosition = 300;
    doc.setFontSize(10);
    doc.text(
      `This line graph shows ${selectedHour !== null ? "order counts" : "sales amounts"} over the selected date range${selectedHour !== null ? " at " + formatHour(selectedHour) : ""}. Each dot represents a day's data, with values displayed below the points.`,
      40,
      yPosition,
      { maxWidth: 500 }
    );
    yPosition += 40;

    doc.setFontSize(11);
    filteredWeeklyData.forEach((day) => {
      doc.text(
        `${formatDate(day.date)} — ${day.total_orders} orders — ₱${Number(day.total_sales || 0).toFixed(2)}`,
        40,
        yPosition
      );
      yPosition += 16;
      if (yPosition > 740) {
        doc.addPage();
        yPosition = 40;
      }
    });

    doc.save(`report-${businessName || "business"}-${filterStart || "all"}-${filterEnd || "all"}.pdf`);
  };

  if (!authChecked || !session) {
    return (
      <div className="min-h-screen bg-[#F4F3ED] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E23838] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Business Reports - MenuQR</title>
      </Head>
      <BusinessOrdersNotifier businessId={businessId} onCountChange={setOrdersCount} />

      <div className="min-h-screen bg-[#F4F3ED]">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-3xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm border border-slate-200"
            >
              Show menu
            </button>
            <p className="text-xs font-semibold text-slate-600">Business Reports</p>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <div className="hidden lg:block">
              <BusinessSidebar ordersCount={ordersCount} />
            </div>

            {sidebarOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 z-50 w-[90vw] max-w-xs overflow-y-auto bg-white shadow-xl border-r border-slate-200 p-6 lg:hidden">
                  <BusinessSidebar onClose={() => setSidebarOpen(false)} ordersCount={ordersCount} />
                </div>
              </>
            )}

            <main className="space-y-8">
              <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                      Business Reports
                    </p>
                    <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">Weekly Sales</h1>
                  </div>
                  <div className="rounded-3xl bg-slate-100 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700">
                    Last 7 days
                  </div>
                </div>
              </div>

              {weeklyData.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:gap-8 xl:grid-cols-[1fr_320px]">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                      <div className="mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Daily Sales</h2>
                        <p className="text-xs sm:text-sm text-slate-500">Click on a day to view detailed orders</p>
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        {weeklyData.map((day) => (
                          <button
                            key={day.id}
                            onClick={() => openReceipt(day)}
                            className="w-full grid grid-cols-3 items-center gap-2 sm:gap-4 p-3 sm:p-4 border border-slate-200 rounded-[24px] bg-white hover:bg-slate-50 transition"
                          >
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                                {formatDate(day.date)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                {day.total_orders}
                              </p>
                              <p className="text-xs text-slate-500">orders</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs sm:text-sm font-bold text-[#E23838]">
                                ₱{Number(day.total_sales).toFixed(2)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <aside className="space-y-4 sm:space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">Overview</h3>
                        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                          <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">Total Sales</p>
                            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#E23838]">₱{weeklyData.reduce((sum, day) => sum + Number(day.total_sales || 0), 0).toFixed(2)}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">Total Orders</p>
                            <p className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">{weeklyData.reduce((sum, day) => sum + (day.total_orders || 0), 0)}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">Avg per Order</p>
                            <p className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">
                              ₱{weeklyData.reduce((sum, day) => sum + (day.total_orders || 0), 0) > 0 ? (weeklyData.reduce((sum, day) => sum + Number(day.total_sales || 0), 0) / weeklyData.reduce((sum, day) => sum + (day.total_orders || 0), 0)).toFixed(2) : "0.00"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Quick report view</h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Filter by date, sort by date order, and export this summary as PDF.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadSalesPdf}
                        className="inline-flex items-center justify-center rounded-3xl bg-[#E23838] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#c22f2f] whitespace-nowrap"
                      >
                        Export PDF
                      </button>
                    </div>

                    <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_260px] mt-6 sm:mt-8">
                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid gap-2 sm:gap-4 grid-cols-2">
                          <label className="block space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-700">
                            <span>Start date</span>
                            <input
                              type="date"
                              value={filterStart}
                              onChange={(e) => setFilterStart(e.target.value)}
                              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                            />
                          </label>
                          <label className="block space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-700">
                            <span>End date</span>
                            <input
                              type="date"
                              value={filterEnd}
                              onChange={(e) => setFilterEnd(e.target.value)}
                              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                            />
                          </label>
                        </div>

                        <div className="grid gap-2 sm:gap-4 grid-cols-2">
                          <label className="block text-xs sm:text-sm text-slate-700">
                            <span className="block mb-1 sm:mb-2">Time of day</span>
                            <select
                              value={selectedHour === null ? "" : String(selectedHour)}
                              onChange={(e) => setSelectedHour(e.target.value === "" ? null : Number(e.target.value))}
                              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                            >
                              <option value="">All day</option>
                              {Array.from({ length: 24 }, (_, hour) => (
                                <option key={hour} value={hour}>
                                  {formatHour(hour)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs sm:text-sm text-slate-700">
                            <span className="block mb-1 sm:mb-2">Sort order</span>
                            <select
                              value={sortAscending ? "asc" : "desc"}
                              onChange={(e) => setSortAscending(e.target.value === "asc")}
                              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                            >
                              <option value="asc">Oldest first</option>
                              <option value="desc">Newest first</option>
                            </select>
                          </label>
                        </div>
                        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterStart("");
                              setFilterEnd("");
                              setSortAscending(true);
                              setSelectedHour(null);
                            }}
                            className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Reset filters
                          </button>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-x-auto">
                          {filteredWeeklyData.length === 0 ? (
                            <p className="text-xs sm:text-sm text-slate-500">
                              No data matches the selected date range.
                            </p>
                          ) : (
                            <div className="relative min-w-full">
                              <svg width="500" height="200" className="w-full min-w-[300px] sm:w-full">
                                <defs>
                                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#E23838" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#E23838" stopOpacity="0.05" />
                                  </linearGradient>
                                </defs>
                                {/* Main chart area */}
                                <rect x="30" y="15" width="460" height="140" fill="url(#chartGradient)" rx="12" />
                                {chartPoints.length > 1 && (
                                  <path
                                    d={`M ${chartPoints.map((point, index) => `${(point.x - 40) * 0.767 + 30} ${(point.y - 20) * 0.7 + 15}`).join(" L ")}`}
                                    fill="none"
                                    stroke="#E23838"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}
                                {chartPoints.map((point, index) => {
                                  const scaledX = (point.x - 40) * 0.767 + 30;
                                  const scaledY = (point.y - 20) * 0.7 + 15;
                                  return (
                                    <g key={index}>
                                      <circle
                                        cx={scaledX}
                                        cy={scaledY}
                                        r="3.5"
                                        fill="#E23838"
                                        stroke="white"
                                        strokeWidth="1.5"
                                      />
                                      <text
                                        x={scaledX}
                                        y={scaledY + 12}
                                        textAnchor="middle"
                                        className="text-[9px] fill-slate-600 font-medium"
                                      >
                                        {selectedHour !== null ? point.value : `₱${point.value.toFixed(0)}`}
                                      </text>
                                      {/* X-axis date labels */}
                                      <text
                                        x={scaledX}
                                        y="170"
                                        textAnchor="middle"
                                        className="text-[9px] fill-slate-500 font-medium"
                                      >
                                        {new Date(filteredWeeklyData[index]?.date).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      <aside className="space-y-3 sm:space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
                        <div>
                          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-slate-500">Quick metrics</p>
                          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-[#E23838]">₱{quickReportTotals.totalSales.toFixed(2)}</p>
                          <p className="text-xs sm:text-sm text-slate-500">Sales in view</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-slate-500">Orders</p>
                          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{quickReportTotals.totalOrders}</p>
                          {selectedHour !== null && (
                            <p className="text-xs sm:text-sm text-slate-500">{selectedHourTotals ?? 0} orders at {formatHour(selectedHour)}</p>
                          )}
                        </div>
                        <div className="rounded-3xl bg-white p-3 sm:p-4 text-xs sm:text-sm text-slate-700">
                          {filteredWeeklyData.length} day{filteredWeeklyData.length === 1 ? "" : "s"} shown
                        </div>
                      </aside>
                    </div>
                  </div>
                </>
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
      </div>
    </>
  );
}