"use client";

import Head from "next/head";
import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import PageShell from "@/components/PageShell";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faDollarSign,
  faShoppingCart,
  faUsers,
  faCalendarAlt,
  faDownload,
  faFilter,
  faArrowUp,
  faArrowDown,
  faTable
} from "@fortawesome/free-solid-svg-icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type ChartPoint = { x: number; y: number; value: number };

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalDiscounts: number;
  revenueChange: number;
  ordersChange: number;
  aovChange: number;
  customersChange: number;
  discountsChange: number;
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

export default function BusinessReportsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [ordersCount, setOrdersCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard data
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    totalDiscounts: 0,
    revenueChange: 0,
    ordersChange: 0,
    aovChange: 0,
    customersChange: 0,
    discountsChange: 0,
  });

  const [salesChartData, setSalesChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [ordersChartData, setOrdersChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [categoryChartData, setCategoryChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [loading, setLoading] = useState(true);

  // Daily Sales Report Modal
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailySalesData, setDailySalesData] = useState<any[]>([]);
  const [selectedDailyOrders, setSelectedDailyOrders] = useState<any | null>(null);
  const [loadingDailyReport, setLoadingDailyReport] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Order Detail Modal
  const [orderDetailModal, setOrderDetailModal] = useState<any>(null);

  const normalizeOrderItems = (items: any) => {
    if (!items) return [];
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(items) ? items : [];
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    });

  const reportSummary = useMemo(() => {
    const totalSales = dailySalesData.reduce((sum, day) => sum + (day.totalSales || 0), 0);
    const totalOrders = dailySalesData.reduce((sum, day) => sum + (day.totalOrders || 0), 0);
    const totalDays = dailySalesData.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const averageOrdersPerDay = totalDays > 0 ? totalOrders / totalDays : 0;
    const busiestDay = dailySalesData.reduce((best: any, day: any) => {
      if (!best || (day.totalOrders || 0) > (best.totalOrders || 0)) {
        return day;
      }
      return best;
    }, null);

    return {
      totalSales,
      totalOrders,
      totalDays,
      averageOrderValue,
      averageOrdersPerDay,
      busiestDay,
    };
  }, [dailySalesData]);

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

  /* =========================
     DASHBOARD DATA FETCHING
  ========================= */
  const fetchDashboardData = async (startOverride?: string, endOverride?: string) => {
    if (!businessId) return;

    setLoading(true);
    try {
      const startDate = new Date(startOverride ?? selectedStartDate);
      const endDate = new Date(endOverride ?? selectedEndDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Fetch orders data
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          discount_amount,
          created_at,
          status,
          user_id,
          items
        `)
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("status", ["paid", "completed"]);

      if (ordersError) throw ordersError;

      // Calculate metrics (accounting for discounts)
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount - (order.discount_amount || 0)), 0) || 0;
      const totalDiscounts = orders?.reduce((sum, order) => sum + (order.discount_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const uniqueCustomers = new Set(orders?.map(order => order.user_id).filter(Boolean)).size;

      // Calculate previous period for comparison
      const prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - days + 1);

      const { data: prevOrders } = await supabase
        .from("orders")
        .select("total_amount, discount_amount, user_id")
        .eq("business_id", businessId)
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString())
        .in("status", ["paid", "completed"]);

      const prevRevenue = prevOrders?.reduce((sum, order) => sum + (order.total_amount - (order.discount_amount || 0)), 0) || 0;
      const prevDiscounts = prevOrders?.reduce((sum, order) => sum + (order.discount_amount || 0), 0) || 0;
      const prevOrdersCount = prevOrders?.length || 0;
      const prevAOV = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
      const prevCustomers = new Set(prevOrders?.map(order => order.user_id).filter(Boolean)).size;

      // Calculate percentage changes
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersChange = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0;
      const aovChange = prevAOV > 0 ? ((averageOrderValue - prevAOV) / prevAOV) * 100 : 0;
      const customersChange = prevCustomers > 0 ? ((uniqueCustomers - prevCustomers) / prevCustomers) * 100 : 0;
      const discountsChange = prevDiscounts > 0 ? ((totalDiscounts - prevDiscounts) / prevDiscounts) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalCustomers: uniqueCustomers,
        totalDiscounts,
        revenueChange,
        ordersChange,
        aovChange,
        customersChange,
        discountsChange,
      });

      // Generate chart data
      generateChartData(orders || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyQuickRange = (range: '7d' | '30d' | '90d') => {
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    const start = new Date();
    start.setDate(now.getDate() - (range === '7d' ? 6 : range === '30d' ? 29 : 89));
    const startStr = start.toISOString().split("T")[0];

    setTimeRange(range);
    setSelectedStartDate(startStr);
    setSelectedEndDate(end);
    fetchDashboardData(startStr, end);
  };

  const handleApplyDateFilter = () => {
    setTimeRange('custom');
    fetchDashboardData(selectedStartDate, selectedEndDate);
  };

  const generateChartData = (orders: any[]) => {
    // Sales trend chart
    const dailySales = orders.reduce((acc, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (order.total_amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const salesLabels = Object.keys(dailySales).sort();
    const salesData = salesLabels.map(date => dailySales[date]);

    setSalesChartData({
      labels: salesLabels.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Daily Sales',
        data: salesData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    });

    // Orders trend chart
    const dailyOrders = orders.reduce((acc, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ordersLabels = Object.keys(dailyOrders).sort();
    const ordersData = ordersLabels.map(date => dailyOrders[date]);

    setOrdersChartData({
      labels: ordersLabels.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Daily Orders',
        data: ordersData,
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 1,
        borderRadius: 4,
      }]
    });

    // Category distribution (simplified - using item categories)
    const categorySales = orders.reduce((acc, order) => {
      order.items?.forEach((item: any) => {
        const category = item.category || 'Other';
        acc[category] = (acc[category] || 0) + (item.price || 0) * (item.quantity || 1);
      });
      return acc;
    }, {} as Record<string, number>);

    const categoryLabels = Object.keys(categorySales);
    const categoryData = Object.values(categorySales);

    setCategoryChartData({
      labels: categoryLabels,
      datasets: [{
        data: categoryData,
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
          '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
        ],
        borderWidth: 0,
      }]
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Daily Sales Report Functions
  const fetchDailySalesReport = async () => {
    if (!businessId) return;

    setLoadingDailyReport(true);
    try {
      const fromDate = new Date(selectedStartDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(selectedEndDate);
      toDate.setHours(23, 59, 59, 999);

      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          created_at,
          status,
          user_id,
          table_id,
          items,
          table:table_id(table_number)
        `)
        .eq("business_id", businessId)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .in("status", ["paid", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group orders by date
      const dailyData = orders?.reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            orders: [],
            totalSales: 0,
            totalOrders: 0,
          };
        }
        acc[date].orders.push(order);
        acc[date].totalSales += order.total_amount || 0;
        acc[date].totalOrders += 1;
        return acc;
      }, {} as Record<string, any>) || {};

      const sortedDailyData = Object.values(dailyData).sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setDailySalesData(sortedDailyData);
      setSelectedDailyOrders(null);
    } catch (error) {
      console.error("Error fetching daily sales report:", error);
    } finally {
      setLoadingDailyReport(false);
    }
  };

  const handleSearchDailyReport = () => {
    fetchDailySalesReport();
  };

  const openDailyReportModal = () => {
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    const start = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    start.setDate(now.getDate() - days + 1);
    const startDate = start.toISOString().split("T")[0];

    setSelectedStartDate(startDate);
    setSelectedEndDate(end);
    setShowDailyReportModal(true);
    fetchDailySalesReport();
  };

  const openOrderDetail = async (order: any) => {
    if (order.table?.table_number) {
      setOrderDetailModal(order);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          discount_amount,
          total_guests,
          senior_pwd_count,
          created_at,
          status,
          user_id,
          customer_name,
          table_id,
          items,
          payment_method,
          gcash_ref,
          payment_reference,
          table:table_id(table_number)
        `)
        .eq("id", order.id)
        .single();

      if (error) throw error;
      setOrderDetailModal(data || order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      setOrderDetailModal(order);
    }
  };

  const MetricCard = ({
    title,
    value,
    change,
    icon,
    color
  }: {
    title: string;
    value: string | number;
    change: number;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <FontAwesomeIcon
              icon={change >= 0 ? faArrowUp : faArrowDown}
              className="mr-1"
            />
            {formatPercentage(change)} from last period
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <FontAwesomeIcon icon={icon} className="text-white text-xl" />
        </div>
      </div>
    </div>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Sales Dashboard - {businessName}</title>
      </Head>

      <PageShell title="Sales Dashboard" subtitle="Track your business performance and insights." className="overflow-x-hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-3xl bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-sm border border-slate-200"
            >
              Show menu
            </button>
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              {ordersCount} orders
            </p>
          </div>

          <div className="grid lg:grid-cols-[240px_1fr] gap-6 min-w-0 min-h-screen items-stretch">
            <div className="hidden lg:block self-stretch max-w-[240px] h-full">
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

            <main className="space-y-8 min-w-0">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                {/* Header */}
              <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Sales Dashboard</h1>
                    <p className="text-slate-600 mt-1">Track your business performance and insights</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                      {[
                        { key: '7d', label: '7 Days' },
                        { key: '30d', label: '30 Days' },
                        { key: '90d', label: '90 Days' }
                      ].map((range) => (
                        <button
                          key={range.key}
                          onClick={() => applyQuickRange(range.key as any)}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            timeRange === range.key
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>

                    {/* Daily Report Button */}
                    <button
                      onClick={openDailyReportModal}
                      className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      Daily Report
                    </button>

                    {/* Export Button */}
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <FontAwesomeIcon icon={faDownload} />
                      Export
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col text-sm text-slate-600">
                      <span className="mb-1 font-semibold text-slate-700">Start date</span>
                      <input
                        type="date"
                        value={selectedStartDate}
                        onChange={(e) => {
                          setSelectedStartDate(e.target.value);
                          setTimeRange('custom');
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                    <label className="flex flex-col text-sm text-slate-600">
                      <span className="mb-1 font-semibold text-slate-700">End date</span>
                      <input
                        type="date"
                        value={selectedEndDate}
                        onChange={(e) => {
                          setSelectedEndDate(e.target.value);
                          setTimeRange('custom');
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div className="flex items-end justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleApplyDateFilter}
                      className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <FontAwesomeIcon icon={faFilter} className="mr-2" />
                      Apply range
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickRange('30d')}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading dashboard data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <MetricCard
                      title="Total Revenue"
                      value={formatCurrency(metrics.totalRevenue)}
                      change={metrics.revenueChange}
                      icon={faDollarSign}
                      color="bg-green-500"
                    />
                    <MetricCard
                      title="Total Orders"
                      value={metrics.totalOrders.toLocaleString()}
                      change={metrics.ordersChange}
                      icon={faShoppingCart}
                      color="bg-blue-500"
                    />
                    <MetricCard
                      title="Average Order Value"
                      value={formatCurrency(metrics.averageOrderValue)}
                      change={metrics.aovChange}
                      icon={faChartLine}
                      color="bg-purple-500"
                    />
                    <MetricCard
                      title="Total Customers"
                      value={metrics.totalCustomers.toLocaleString()}
                      change={metrics.customersChange}
                      icon={faUsers}
                      color="bg-orange-500"
                    />
                    <MetricCard
                      title="Total Discounts"
                      value={formatCurrency(metrics.totalDiscounts)}
                      change={metrics.discountsChange}
                      icon={faDollarSign}
                      color="bg-red-500"
                    />
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Sales Trend Chart */}
                    <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Sales Trend</h3>
                          <p className="text-sm text-slate-600">Daily revenue over time</p>
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                          {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
                        </div>
                      </div>
                      <div className="h-80">
                        <Line
                          data={salesChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                              tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: 'white',
                                bodyColor: 'white',
                                callbacks: {
                                  label: (context) => formatCurrency(Number(context.parsed.y) || 0)
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => formatCurrency(Number(value))
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">Sales by Category</h3>
                        <p className="text-sm text-slate-600">Revenue distribution</p>
                      </div>
                      <div className="h-80 flex items-center justify-center">
                        <Doughnut
                          data={categoryChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom' as const,
                                labels: {
                                  padding: 20,
                                  usePointStyle: true,
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orders Chart */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Order Volume</h3>
                        <p className="text-sm text-slate-600">Daily order count over time</p>
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
                        Order trends
                      </div>
                    </div>
                    <div className="h-80">
                      <Bar
                        data={ordersChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              titleColor: 'white',
                              bodyColor: 'white',
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>

          {showDailyReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
              <div className="w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-black/10">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 sm:px-8 sm:py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Daily Sales Report</p>
                      <h2 className="text-2xl font-bold text-slate-900">Orders by Date</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDailyReportModal(false)}
                      className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Use the calendar filter to search specific date ranges. Expand each date to inspect orders and view the items customers ordered.</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_auto]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col text-sm text-slate-600">
                        <span className="mb-1 font-medium text-slate-700">From</span>
                        <input
                          type="date"
                          value={selectedStartDate}
                          onChange={(e) => setSelectedStartDate(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <label className="flex flex-col text-sm text-slate-600">
                        <span className="mb-1 font-medium text-slate-700">To</span>
                        <input
                          type="date"
                          value={selectedEndDate}
                          onChange={(e) => setSelectedEndDate(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSearchDailyReport}
                        className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <FontAwesomeIcon icon={faFilter} className="mr-2" />
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const endDate = now.toISOString().split('T')[0];
                          const startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
                          setSelectedStartDate(startDate);
                          setSelectedEndDate(endDate);
                          fetchDailySalesReport();
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Range</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{selectedStartDate} – {selectedEndDate}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Sales</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(reportSummary.totalSales)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Orders</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{reportSummary.totalOrders}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Avg Order Value</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(reportSummary.averageOrderValue)}</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[62vh] overflow-y-auto px-0 py-4 sm:px-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Date</th>
                          <th className="px-4 py-3 text-right font-semibold">Total Sales</th>
                          <th className="px-4 py-3 text-right font-semibold">Total Orders</th>
                          <th className="px-4 py-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {loadingDailyReport ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                              Loading daily sales report...
                            </td>
                          </tr>
                        ) : dailySalesData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                              No daily sales data available for the selected period.
                            </td>
                          </tr>
                        ) : (
                          dailySalesData.map((daily) => (
                              <tr key={daily.date} className="hover:bg-slate-50">
                                <td className="px-4 py-4 font-medium text-slate-900">{new Date(daily.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td className="px-4 py-4 text-right text-slate-900">{formatCurrency(daily.totalSales)}</td>
                                <td className="px-4 py-4 text-right text-slate-900">{daily.totalOrders}</td>
                                <td className="px-4 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDailyOrders(daily)}
                                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    View Order Details
                                  </button>
                                </td>
                              </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Report details</p>
                  <ul className="mt-3 space-y-2 list-disc pl-5">
                    <li>Filter the report by a specific calendar range to focus on a particular day or week.</li>
                    <li>Open the date action to view each order's details in a popup modal.</li>
                    <li>Open an order to see exact items, payment method, and reference number.</li>
                    <li>Use the summary cards to compare daily performance, average order value, and busiest day at a glance.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

    {selectedDailyOrders && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-slate-900 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Order details</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{new Date(selectedDailyOrders.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</h2>
                  <p className="text-sm text-slate-300 mt-1">{selectedDailyOrders.orders.length} order{selectedDailyOrders.orders.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDailyOrders(null)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-5 sm:px-6">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm bg-white">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Order #</th>
                        <th className="px-4 py-3 text-left font-semibold">Time</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Discount</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                        <th className="px-4 py-3 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedDailyOrders.orders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900">{order.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                          <td className="px-4 py-3 text-slate-600 capitalize">{order.status}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(order.discount_amount || 0)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency((order.total_amount || 0) - (order.discount_amount || 0))}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openOrderDetail(order)}
                              className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Order Detail Modal */}
    {orderDetailModal && (
      <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 py-8">
        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center">
          <div className="flex w-full max-h-[85vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-slate-900 px-5 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Order detail</p>
                  <h2 className="mt-1 text-lg font-bold text-white">Order #{orderDetailModal.id.slice(0, 8)}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderDetailModal(null)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(orderDetailModal.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Time</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(orderDetailModal.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{orderDetailModal.status}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Total (Gross)</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(orderDetailModal.total_amount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Discount</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(orderDetailModal.discount_amount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Net Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency((orderDetailModal.total_amount || 0) - (orderDetailModal.discount_amount || 0))}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{orderDetailModal.customer_name || orderDetailModal.user_id || 'Guest'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Table</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{orderDetailModal.table?.table_number || orderDetailModal.table_number || orderDetailModal.table_id || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Discount detail</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{orderDetailModal.discount_amount ? formatCurrency(orderDetailModal.discount_amount) : 'None'}</p>
                    {(orderDetailModal.total_guests || orderDetailModal.senior_pwd_count) ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {orderDetailModal.senior_pwd_count || 0} Senior/PWD of {orderDetailModal.total_guests || 0} guests
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Payment information</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-700">
                      {orderDetailModal.payment_method ? orderDetailModal.payment_method.toUpperCase() : 'CASH'}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] text-slate-600">Amount Paid</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency((orderDetailModal.total_amount || 0) - (orderDetailModal.discount_amount || 0))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600">Reference</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{orderDetailModal.gcash_ref || orderDetailModal.payment_reference || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Items ordered</h3>
                      <p className="text-[10px] text-slate-500">Review each item and subtotal.</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600">{normalizeOrderItems(orderDetailModal.items).length} items</span>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold">Item</th>
                          <th className="px-2 py-1 text-right font-semibold">Qty</th>
                          <th className="px-2 py-1 text-right font-semibold">Price</th>
                          <th className="px-2 py-1 text-right font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {normalizeOrderItems(orderDetailModal.items).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-2 py-2 text-center text-slate-500">
                              No item details available for this order.
                            </td>
                          </tr>
                        ) : (
                          normalizeOrderItems(orderDetailModal.items).map((item: any, index: number) => {
                            const quantity = item.qty ?? item.quantity ?? 1;
                            const itemPrice = Number(item.price ?? item.base_price ?? 0);
                            const subtotal = itemPrice * quantity;
                            return (
                              <tr key={index}>
                                <td className="px-2 py-1 text-slate-900">{item.name || item.title || item.menu_item_id || 'Item'}</td>
                                <td className="px-2 py-1 text-right text-slate-600">{quantity}</td>
                                <td className="px-2 py-1 text-right text-slate-600">{formatCurrency(itemPrice)}</td>
                                <td className="px-2 py-1 text-right font-semibold text-slate-900">{formatCurrency(subtotal)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
      </PageShell>
    </>
  );
}