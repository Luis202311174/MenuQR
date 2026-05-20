"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
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
import jsPDF from "jspdf";
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
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

import DailySalesReportModal from "@/components/business/reports/DailySalesReportModal";
import DailyOrderDetailsModal from "@/components/business/reports/DailyOrderDetailsModal";
import OrderDetailModal from "@/components/business/reports/OrderDetailModal";
import SalesReportAnalyzer from "@/components/SalesReportAnalyzer";

import type {
  DailySalesDataRow,
  DailySalesOrderRow,
} from "@/components/business/reports/DailyOrderDetailsModal";


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
  const auth = useBusinessAuth("reports", "view");

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [ordersCount, setOrdersCount] = useState(0);

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

  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [showAnalyzerSetup, setShowAnalyzerSetup] = useState(false);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analyzerScope, setAnalyzerScope] = useState<'selected' | 'weekly' | 'monthly' | 'overall'>('selected');
  const [analyzerMonth, setAnalyzerMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [loadingOverallOrders, setLoadingOverallOrders] = useState(false);

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [loading, setLoading] = useState(true);

  // Daily Sales Report Modal
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailySalesData, setDailySalesData] = useState<DailySalesDataRow[]>([]);
  const [selectedDailyOrders, setSelectedDailyOrders] = useState<DailySalesDataRow | null>(null);
  const [loadingDailyReport, setLoadingDailyReport] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState<Array<{id: string; name: string; current_stock?: number | null; is_trackable?: boolean; availability?: boolean;}>>([]);
  const [exportingReport, setExportingReport] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Order Detail Modal
  const [orderDetailModal, setOrderDetailModal] = useState<DailySalesOrderRow | null>(null);


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
    if (!auth.checked) return;

    const init = async () => {
      try {
        if (auth.owner) {
          const { data } = await supabase.auth.getSession();
          const sess = data.session;
          if (!sess?.user) return;

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
          setBusinessName(bizData.name || "");
          return;
        }

        if (auth.staffSession) {
          const bizId = auth.staffSession.businessId;
          const { data: bizData, error: bizError } = await supabase
            .from("businesses")
            .select("id, name, address, contact_info, slug")
            .eq("id", bizId)
            .single();

          if (bizError || !bizData) {
            console.error("Error loading business:", bizError);
            return;
          }

          setBusinessId(bizData.id);
          setBusinessData(bizData);
          setBusinessName(bizData.name || "");
        }
      } catch (error) {
        console.error("Error checking supabase session:", error);
      }
    };

    init();
  }, [auth]);

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
          items,
          payment_method,
          table_id
        `)
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("status", ["paid", "completed"]);

      if (ordersError) throw ordersError;

      setRawOrders(orders || []);

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

      const { data: menuItems, error: availabilityError } = await supabase
        .from("menu_items")
        .select("id,name,current_stock,is_trackable,availability")
        .eq("business_id", businessId);

      if (!availabilityError && menuItems) {
        setUnavailableItems(
          menuItems.filter(
            (item) =>
              item.availability === false ||
              (item.is_trackable === true && Number(item.current_stock ?? 0) <= 0)
          )
        );
      }
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

  const fetchOverallOrders = async () => {
    if (!businessId) return;
    setLoadingOverallOrders(true);

    try {
      const { data: orders, error } = await supabase
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
        .in("status", ["paid", "completed"]);

      if (error) throw error;
      setAllOrders(orders || []);
    } catch (error) {
      console.error("Error fetching overall orders:", error);
    } finally {
      setLoadingOverallOrders(false);
    }
  };

  useEffect(() => {
    if (!businessId) return;
    if (analyzerScope === 'overall' && allOrders.length === 0) {
      fetchOverallOrders();
    }
  }, [businessId, analyzerScope, allOrders.length]);

  const analyzerOrders = useMemo(() => {
    const ordersSource = analyzerScope === 'overall' && allOrders.length > 0 ? allOrders : rawOrders;

    const normalizedOrders = ordersSource.map((order: any) => ({
      id: order.id,
      createdAt: order.created_at,
      total: order.total_amount || 0,
      items: normalizeOrderItems(order.items).map((item: any) => ({
        menuItemId: item.menu_item_id || item.id || "unknown",
        name: item.name || "Unknown Item",
        price: item.price || item.base_price || 0,
        quantity: item.qty || item.quantity || 1,
      }))
    }));

    if (analyzerScope === 'weekly') {
      const end = new Date(selectedEndDate || new Date().toISOString().split('T')[0]);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      return normalizedOrders.filter((order) => {
        const created = new Date(order.createdAt);
        return created >= start && created <= end;
      });
    }

    if (analyzerScope === 'monthly') {
      const [year, month] = analyzerMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      return normalizedOrders.filter((order) => {
        const created = new Date(order.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
    }

    return normalizedOrders;
  }, [allOrders, analyzerScope, rawOrders, selectedEndDate, analyzerMonth]);

  const analyzerDateLabel = useMemo(() => {
    switch (analyzerScope) {
      case 'weekly':
        return `Weekly review ending ${new Date(selectedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'monthly':
        return `Monthly review for ${new Date(`${analyzerMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'overall':
        return 'Overall business review';
      default:
        return `Selected range: ${selectedStartDate} to ${selectedEndDate}`;
    }
  }, [analyzerScope, selectedStartDate, selectedEndDate, analyzerMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  // Safely handle the document title in the App Router for a Client Component
  useEffect(() => {
    document.title = `Sales Dashboard - ${businessName || "Loading..."}`;
  }, [businessName]);

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatPdfCurrency = (value: number) => {
    const amount = Number(value || 0);
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `P ${formatted}`;
  };

  const handleExportSalesReportPDF = async () => {
    setExportingReport(true);

    try {
      if (!businessId) throw new Error("Business not loaded.");
      const fromDate = new Date(selectedStartDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(selectedEndDate);
      toDate.setHours(23, 59, 59, 999);

      const { data: orders, error: exportOrdersError } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          discount_amount,
          created_at,
          status,
          user_id,
          items,
          payment_method,
          table_id
        `)
        .eq("business_id", businessId)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .in("status", ["paid", "completed"])
        .order("created_at", { ascending: true });

      if (exportOrdersError) {
        throw exportOrdersError;
      }

      const ordersForExport = orders || [];
      const paymentGroups = ordersForExport.reduce((acc: Record<string, { count: number; total: number }>, order: any) => {
        const method = (order.payment_method || "unknown").toString().toLowerCase();
        const key = method === "gcash" ? "GCash" : method === "cash" ? "Cash" : "Other";
        if (!acc[key]) acc[key] = { count: 0, total: 0 };
        acc[key].count += 1;
        acc[key].total += Number(order.total_amount || 0) - Number(order.discount_amount || 0);
        return acc;
      }, {});

      const bestSellerMap = ordersForExport.reduce((acc: Record<string, { quantity: number; revenue: number }>, order: any) => {
        normalizeOrderItems(order.items).forEach((item: any) => {
          const name = item.name || item.title || item.menu_item_id || "Unknown Item";
          const quantity = Number(item.qty ?? item.quantity ?? 0);
          const price = Number(item.price ?? item.base_price ?? item.total ?? 0);
          if (!acc[name]) acc[name] = { quantity: 0, revenue: 0 };
          acc[name].quantity += quantity;
          acc[name].revenue += quantity * price;
        });
        return acc;
      }, {});

      const bestSellers = Object.entries(bestSellerMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 15);

      const salesByHourMap = Array.from({ length: 24 }, (_, hour) => {
        const label = `${hour.toString().padStart(2, "0")}:00 - ${hour.toString().padStart(2, "0")}:59`;
        return [label, { count: 0, total: 0 }] as const;
      }).reduce((acc, [label, value]) => {
        acc[label] = { ...value };
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      ordersForExport.forEach((order: any) => {
        const date = new Date(order.created_at);
        if (Number.isNaN(date.getTime())) return;
        const hour = date.getHours();
        const label = `${hour.toString().padStart(2, "0")}:00 - ${hour.toString().padStart(2, "0")}:59`;
        if (!salesByHourMap[label]) {
          salesByHourMap[label] = { count: 0, total: 0 };
        }
        salesByHourMap[label].count += 1;
        salesByHourMap[label].total += Number(order.total_amount || 0) - Number(order.discount_amount || 0);
      });

      const salesByHour = Object.entries(salesByHourMap)
        .map(([label, data]) => ({ label, ...data }));

      const dineInOrders = orders.filter((order: any) => order.table_id).length;
      const takeoutOrders = orders.length - dineInOrders;
      const dineInRatio = orders.length > 0 ? `${((dineInOrders / orders.length) * 100).toFixed(0)}%` : "0%";
      const takeoutRatio = orders.length > 0 ? `${((takeoutOrders / orders.length) * 100).toFixed(0)}%` : "0%";

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const margin = 15;
      const pageWidth = 210;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const drawSectionTitle = (title: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor("#1f2937");
        doc.text(title, margin, y);
        y += 8;
      };

      const drawRow = (cells: string[], widths: number[], options?: { header?: boolean; fill?: boolean; fillColor?: string; textColor?: string }) => {
        const lineHeight = 5;
        const cellLines = cells.map((cell, index) => doc.splitTextToSize(cell, widths[index] - 2));
        const maxLines = Math.max(...cellLines.map((lines) => lines.length));
        const rowHeight = lineHeight * maxLines + 4;
        if (options?.fill) {
          const fillColor = options.fillColor || "#EAF3FB";
          doc.setFillColor(fillColor);
          doc.rect(margin, y, contentWidth, rowHeight, "F");
        }
        let x = margin;
        cells.forEach((cell, index) => {
          const lines = cellLines[index];
          const align = "center";
          doc.setFont("helvetica", options?.header ? "bold" : "normal");
          doc.setFontSize(10);
          doc.setTextColor(options?.textColor || "#0f172a");
          const textX = x + widths[index] / 2;
          lines.forEach((line: string, lineIndex: number) => {
            doc.text(line, textX, y + 4 + lineIndex * lineHeight, {
              align,
              maxWidth: widths[index] - 2,
            });
          });
          x += widths[index];
        });
        y += rowHeight;
      };

      const maybeAddPage = (requiredHeight: number) => {
        if (y + requiredHeight > 287) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor("#1f2937");
      doc.text("Sales Report", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Business: ${businessName || "Business"}`, margin, y);
      y += 5;
      doc.text(`Period: ${selectedStartDate} – ${selectedEndDate}`, margin, y);
      y += 5;
      doc.text(`Report generated: ${new Date().toLocaleString()}`, margin, y);
      y += 10;

      // summary header
      drawSectionTitle("Summary");
      maybeAddPage(26);
      drawRow(["Metric", "Value", "Ratio"], [contentWidth * 0.35, contentWidth * 0.35, contentWidth * 0.3], { header: true, fill: true, fillColor: "#4a7ebb", textColor: "#ffffff" });
      drawRow(["Total Sales", formatPdfCurrency(metrics.totalRevenue), ""], [contentWidth * 0.35, contentWidth * 0.35, contentWidth * 0.3], { fill: true, fillColor: "#EAF3FB" });
      drawRow(["Total Transactions", orders.length.toString(), ""], [contentWidth * 0.35, contentWidth * 0.35, contentWidth * 0.3]);
      drawRow(["Dine In vs Takeout", `${dineInOrders} / ${takeoutOrders}`, `${dineInRatio} / ${takeoutRatio}`], [contentWidth * 0.35, contentWidth * 0.35, contentWidth * 0.3], { fill: true, fillColor: "#EAF3FB" });
      y += 4;

      // payment breakdown
      drawSectionTitle("Payment Breakdown");
      maybeAddPage(26 + bestSellers.length * 8);
      drawRow(["Method", "Transaction Count", "Total Amount"], [contentWidth * 0.35, contentWidth * 0.25, contentWidth * 0.4], { header: true, fill: true, fillColor: "#4a7ebb", textColor: "#ffffff" });
      Object.entries(paymentGroups).forEach(([method, summary], index) => {
        drawRow([method, summary.count.toString(), formatPdfCurrency(summary.total)], [contentWidth * 0.35, contentWidth * 0.25, contentWidth * 0.4], { fill: index % 2 === 0, fillColor: "#EAF3FB" });
      });
      y += 4;

      // best sellers
      drawSectionTitle("Best Sellers");
      maybeAddPage(26 + bestSellers.length * 8);
      drawRow(["Item Name", "Quantity Sold", "Revenue"], [contentWidth * 0.45, contentWidth * 0.2, contentWidth * 0.35], { header: true, fill: true, fillColor: "#4a7ebb", textColor: "#ffffff" });
      bestSellers.forEach((item, idx) => {
        drawRow([item.name, item.quantity.toString(), formatPdfCurrency(item.revenue)], [contentWidth * 0.45, contentWidth * 0.2, contentWidth * 0.35], { fill: idx % 2 === 0, fillColor: "#EAF3FB" });
      });
      y += 4;

      // start a new page for hourly items
      doc.addPage();
      y = margin;

      // sales by hour
      drawSectionTitle("Sales by Hour");
      maybeAddPage(26 + salesByHour.length * 8);
      drawRow(["Time Block", "Transactions", "Sales"], [contentWidth * 0.45, contentWidth * 0.2, contentWidth * 0.35], { header: true, fill: true, fillColor: "#4a7ebb", textColor: "#ffffff" });
      salesByHour.forEach((row, idx) => {
        drawRow([row.label, row.count.toString(), formatPdfCurrency(row.total)], [contentWidth * 0.45, contentWidth * 0.2, contentWidth * 0.35], { fill: idx % 2 === 0, fillColor: "#EAF3FB" });
      });
      y += 4;

      // move unavailable items to its own page
      doc.addPage();
      y = margin;
      drawSectionTitle("Unavailable Items");
      maybeAddPage(26 + unavailableItems.length * 8);
      drawRow(["Item Name", "Status"], [contentWidth * 0.65, contentWidth * 0.35], { header: true, fill: true, fillColor: "#C0392B", textColor: "#ffffff" });
      unavailableItems.forEach((item, idx) => {
        const status = item.availability === false ? "Not available" : item.is_trackable ? "Out of stock" : "Unavailable";
        drawRow([item.name || "Unknown", status], [contentWidth * 0.65, contentWidth * 0.35], { fill: idx % 2 === 0, fillColor: "#FDEDEC" });
      });

      doc.save(`Sales-Report-${selectedStartDate}-to-${selectedEndDate}.pdf`);
    } catch (error) {
      console.error("Error generating sales report PDF:", error);
      window.alert("Failed to generate the sales report PDF. Please try again.");
    } finally {
      setExportingReport(false);
    }
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
          coupon_id,
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
          coupon_id,
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
      setOrderDetailModal((data ?? order) as DailySalesOrderRow);
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
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
          <div className={`flex items-center mt-2 text-xs sm:text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <FontAwesomeIcon
              icon={change >= 0 ? faArrowUp : faArrowDown}
              className="mr-1 text-[10px] sm:text-sm"
            />
            {formatPercentage(change)} from last period
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
          <FontAwesomeIcon icon={icon} className="text-white text-lg sm:text-xl" />
        </div>
      </div>
    </div>
  );

  if (!auth.checked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <PageShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600">Loading business data…</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell title="Sales Dashboard" subtitle="Track your business performance and insights." className="overflow-x-hidden">
          <div className="space-y-8">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                {/* Header */}
              <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Sales Dashboard</h1>
                      <p className="text-sm sm:text-base text-slate-600 mt-1">Track your business performance and insights</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                            className={`px-3 py-1.5 text-xs leading-none sm:px-4 sm:py-2 sm:text-sm font-medium rounded-md transition-colors ${
                              timeRange === range.key
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>

                      {/* Export Button */}
                      <button
                        onClick={handleExportSalesReportPDF}
                        disabled={exportingReport}
                        className="flex h-10 min-h-[38px] items-center gap-2 px-3 py-2 text-xs leading-none sm:px-4 sm:py-2 sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <FontAwesomeIcon icon={faDownload} className="text-sm" />
                        {exportingReport ? 'Exporting...' : 'Export'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Analyzer Button */}
                      <button
                        onClick={() => {
                          setShowAnalyzerSetup(true);
                        }}
                        className="flex h-10 min-h-[38px] items-center gap-2 px-3 py-2 text-xs leading-none sm:px-4 sm:py-2 sm:text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                        disabled={analyzerLoading || (analyzerScope === 'overall' && loadingOverallOrders)}
                      >
                        {analyzerLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faLightbulb} className="text-sm" />
                            {showAnalyzer ? 'Hide AI Analyzer' : 'AI Analyzer'}
                          </>
                        )}
                      </button>

                      {/* Daily Report Button */}
                      <button
                        onClick={openDailyReportModal}
                        className="flex h-10 min-h-[38px] items-center gap-2 px-3 py-2 text-xs leading-none sm:px-4 sm:py-2 sm:text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-sm" />
                        Daily Report
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col text-xs sm:text-sm text-slate-600">
                      <span className="mb-1 font-semibold text-slate-700">Start date</span>
                      <input
                        type="date"
                        value={selectedStartDate}
                        onChange={(e) => {
                          setSelectedStartDate(e.target.value);
                          setTimeRange('custom');
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                    <label className="flex flex-col text-xs sm:text-sm text-slate-600">
                      <span className="mb-1 font-semibold text-slate-700">End date</span>
                      <input
                        type="date"
                        value={selectedEndDate}
                        onChange={(e) => {
                          setSelectedEndDate(e.target.value);
                          setTimeRange('custom');
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-end justify-end gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleApplyDateFilter}
                      className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <FontAwesomeIcon icon={faFilter} className="mr-2 text-sm" />
                      Apply range
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickRange('30d')}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
                    {/* Sales Trend Chart */}
                    <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Sales Trend</h3>
                          <p className="text-xs sm:text-sm text-slate-600">Daily revenue over time</p>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-slate-600">
                          <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-sm" />
                          {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
                        </div>
                      </div>
                      <div className="h-56 sm:h-72">
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
                                bodyFont: { size: 12 },
                                titleFont: { size: 12 },
                                callbacks: {
                                  label: (context) => formatCurrency(Number(context.parsed.y) || 0)
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => formatCurrency(Number(value)),
                                  font: { size: 10 }
                                }
                              },
                              x: {
                                ticks: {
                                  font: { size: 10 }
                                }
                              }
                            },
                            elements: {
                              point: {
                                radius: 2,
                                hoverRadius: 4
                              },
                              line: {
                                borderWidth: 2
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                      <div className="mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">Sales by Category</h3>
                        <p className="text-xs sm:text-sm text-slate-600">Revenue distribution</p>
                      </div>
                      <div className="h-56 sm:h-72 flex items-center justify-center">
                        <Doughnut
                          data={categoryChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom' as const,
                                labels: {
                                  padding: 10,
                                  usePointStyle: true,
                                  font: { size: 10 }
                                }
                              },
                              tooltip: {
                                bodyFont: { size: 12 },
                                titleFont: { size: 12 },
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
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">Order Volume</h3>
                        <p className="text-xs sm:text-sm text-slate-600">Daily order count over time</p>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-slate-600">
                        <FontAwesomeIcon icon={faShoppingCart} className="mr-2 text-sm" />
                        Order trends
                      </div>
                    </div>
                    <div className="h-56 sm:h-72">
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
                              bodyFont: { size: 12 },
                              titleFont: { size: 12 }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                font: { size: 10 }
                              }
                            },
                            x: {
                              ticks: {
                                font: { size: 10 }
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

          {showAnalyzerSetup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-3 sm:p-6" onClick={() => setShowAnalyzerSetup(false)}>
              <div className="relative w-full max-w-full sm:max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200" onClick={(event) => event.stopPropagation()}>
                <div className="border-b border-slate-200 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">AI Analyzer settings</h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500">Choose which report to analyze before displaying the results.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnalyzerSetup(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    >
                      <span className="text-lg">×</span>
                      <span className="sr-only">Close settings</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { key: 'selected', label: 'Selected date range' },
                      { key: 'weekly', label: 'Weekly' },
                      { key: 'monthly', label: 'Monthly' },
                      { key: 'overall', label: 'Overall' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setAnalyzerScope(option.key as any)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${analyzerScope === option.key ? 'border-blue-600 bg-blue-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <p className="font-semibold text-sm">{option.label}</p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">{option.key === 'selected' ? 'Use a custom start/end date.' : option.key === 'weekly' ? 'Analyze the last 7 days.' : option.key === 'monthly' ? 'Analyze the selected month.' : 'Analyze all available orders.'}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-4">
                    {analyzerScope === 'selected' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col text-sm text-slate-600">
                          <span className="mb-1 font-semibold text-slate-700">Start date</span>
                          <input
                            type="date"
                            value={selectedStartDate}
                            onChange={(e) => setSelectedStartDate(e.target.value)}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </label>
                        <label className="flex flex-col text-sm text-slate-600">
                          <span className="mb-1 font-semibold text-slate-700">End date</span>
                          <input
                            type="date"
                            value={selectedEndDate}
                            onChange={(e) => setSelectedEndDate(e.target.value)}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </label>
                      </div>
                    )}

                    {analyzerScope === 'monthly' && (
                      <label className="flex flex-col text-sm text-slate-600">
                        <span className="mb-1 font-semibold text-slate-700">Month</span>
                        <input
                          type="month"
                          value={analyzerMonth}
                          onChange={(e) => setAnalyzerMonth(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    )}

                    {analyzerScope === 'weekly' && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm text-slate-700">Weekly analysis will use the last 7 days ending on the selected end date.</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="flex flex-col text-sm text-slate-600">
                            <span className="mb-1 font-semibold text-slate-700">End date</span>
                            <input
                              type="date"
                              value={selectedEndDate}
                              onChange={(e) => setSelectedEndDate(e.target.value)}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                  <button
                    type="button"
                    onClick={() => setShowAnalyzerSetup(false)}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnalyzerSetup(false);
                      setShowAnalyzer(true);
                      setAnalyzerLoading(true);
                      setTimeout(() => setAnalyzerLoading(false), 3500);
                    }}
                    className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
                  >
                    Analyze now
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAnalyzer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-3 sm:p-6" onClick={() => setShowAnalyzer(false)}>
              <div className="relative w-full max-w-full sm:max-w-5xl lg:max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200" onClick={(event) => event.stopPropagation()}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 p-4 sm:p-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">AI Analyzer</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">{analyzerDateLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAnalyzer(false)}
                    className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 sm:mt-0"
                  >
                    <span className="text-lg">×</span>
                    <span className="sr-only">Close analyzer</span>
                  </button>
                </div>
                <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                  {analyzerLoading ? (
                    <div className="flex min-h-[320px] items-center justify-center py-16">
                      <div className="text-center w-full max-w-sm">
                        {/* Enhanced Loading Animation */}
                        <div className="relative mb-6 sm:mb-8 mx-auto" style={{ width: '70px', height: '70px' }}>
                          {/* Outer rotating ring */}
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
                          {/* Middle pulsing ring */}
                          <div className="absolute inset-0 rounded-full border border-purple-300 animate-pulse"></div>
                          {/* Inner centered element */}
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse opacity-20"></div>
                            <div className="relative z-10 text-2xl">📊</div>
                          </div>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Analyzing Your Sales</h3>
                        <p className="text-sm text-slate-600 mb-5">Processing data and generating insights...</p>

                        {/* Progress indicator */}
                        <div className="space-y-2.5 mb-5 text-sm sm:text-base">
                          <div className="flex items-start gap-2 text-left">
                            <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-sm text-slate-600">Calculating revenue metrics</span>
                          </div>
                          <div className="flex items-start gap-2 text-left">
                            <span className="inline-block w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                            <span className="text-sm text-slate-600">Identifying top performers</span>
                          </div>
                          <div className="flex items-start gap-2 text-left">
                            <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                            <span className="text-sm text-slate-600">Generating recommendations</span>
                          </div>
                        </div>

                        {/* Animated dots */}
                        <div className="flex justify-center gap-2">
                          <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>

                        <style jsx>{`
                          @keyframes spin {
                            to {
                              transform: rotate(360deg);
                            }
                          }
                        `}</style>
                      </div>
                    </div>
                  ) : (
                    <SalesReportAnalyzer
                      orders={analyzerOrders}
                      suggestionThreshold={3}
                      analysisType={analyzerScope}
                      selectedMonth={analyzerMonth}
                      dateRangeLabel={analyzerDateLabel}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <DailySalesReportModal
            isOpen={showDailyReportModal}
            selectedStartDate={selectedStartDate}
            selectedEndDate={selectedEndDate}
            onChangeStartDate={(v) => {
              setSelectedStartDate(v);
            }}
            onChangeEndDate={(v) => {
              setSelectedEndDate(v);
            }}
            loadingDailyReport={loadingDailyReport}
            dailySalesData={dailySalesData}
            onSearch={handleSearchDailyReport}
            onReset={() => {
              const now = new Date();
              const endDate = now.toISOString().split('T')[0];
              const startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
              setSelectedStartDate(startDate);
              setSelectedEndDate(endDate);
              fetchDailySalesReport();
            }}
            onClose={() => setShowDailyReportModal(false)}
            onSelectDay={(row) => {
              setSelectedDailyOrders(row);
            }}
            formatCurrency={formatCurrency}
          />

          <DailyOrderDetailsModal
            daily={selectedDailyOrders as DailySalesDataRow | null}
            isOpen={showDailyReportModal && !!selectedDailyOrders}
            onClose={() => setSelectedDailyOrders(null)}
            onOpenOrderDetail={(order) => openOrderDetail(order)}
            formatCurrency={formatCurrency}
          />


          <OrderDetailModal
            order={orderDetailModal}
            isOpen={showDailyReportModal && !!orderDetailModal}
            onClose={() => setOrderDetailModal(null)}
            formatCurrency={formatCurrency}
            normalizeOrderItems={normalizeOrderItems}
          />
        </div>

      </PageShell>
    </>
  );
}
