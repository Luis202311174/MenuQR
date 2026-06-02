"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { faChartLine, faLightbulb, faStar, faChartBar, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// You'll need to define these types based on your actual data structure from Supabase
interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  createdAt: string; // or Date
  items: OrderItem[];
  total?: number;
  total_amount?: number;
  amount_received?: number;
  order_duration_ms?: number;
  most_ordered_item?: string;
  spend_per_order?: number;
  customer_behavior?: any;
}

interface SalesReportAnalyzerSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  averageOrderDurationMs: number;
  averageSpendPerOrder: number;
  mostFrequentMostOrderedItem?: string;
  bestSellers: { name: string; count: number }[];
  leastSellers: { name: string; count: number }[];
  suggestions: Array<{
    items: [string] | [string, string];
    count: number;
    text: string;
    type: 'combo' | 'promotion';
  }>;
  behaviorInsights?: any;
}

interface SalesReportAnalyzerProps {
  orders: Order[];
  // A threshold for how many times a pair must be bought together to be "frequent"
  suggestionThreshold?: number;
  analysisType?: 'selected' | 'weekly' | 'monthly' | 'overall';
  selectedMonth?: string;
  dateRangeLabel?: string;
  // optional explicit date range to analyze (ISO date strings)
  selectedStartDate?: string;
  selectedEndDate?: string;
}

// A helper function to format currency, consistent with other components
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export default function SalesReportAnalyzer({ 
  orders, 
  suggestionThreshold = 1,
  analysisType = 'selected',
  selectedMonth,
  dateRangeLabel,
  selectedStartDate,
  selectedEndDate,
}: SalesReportAnalyzerProps) {
  const analysis = useMemo(() => {
    const summarizeOrders = (orderList: Order[]) => {
      if (!orderList || orderList.length === 0) {
        return {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          averageOrderDurationMs: 0,
          averageSpendPerOrder: 0,
          mostFrequentMostOrderedItem: undefined,
          bestSellers: [],
          leastSellers: [],
          suggestions: [],
        };
      }

      const totalRevenue = orderList.reduce((sum, order) => {
        const revenue = (order.amount_received != null)
          ? Number(order.amount_received)
          : (order.total != null ? Number(order.total) : Number(order.total_amount ?? 0));
        return sum + revenue;
      }, 0);
      const totalOrders = orderList.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalDuration = orderList.reduce((sum, order) => sum + (Number(order.order_duration_ms ?? 0)), 0);
      const averageOrderDurationMs = totalOrders > 0 ? totalDuration / totalOrders : 0;
      const totalSpendPerOrder = orderList.reduce((sum, order) => sum + (Number(order.spend_per_order ?? 0)), 0);
      const averageSpendPerOrder = totalOrders > 0 ? totalSpendPerOrder / totalOrders : 0;

      // Analyze customer_behavior JSON blobs (if present) for simple insights

      const behaviorAgg = {
        totalSessions: orderList.length,
        totalEvents: 0,
        avgEventsPerSession: 0,
        abandonmentCount: 0,
        abandonmentRate: 0,
        avgMaxScrollPercent: 0,
        topSearches: {} as Record<string, number>,
        topFilters: {} as Record<string, number>,
        // detailed maps
        tableScans: {} as Record<string, number>,
        deviceTypes: {} as Record<string, number>,
        categoryViews: {} as Record<string, number>,
        itemViews: {} as Record<string, number>,
        addToCart: {} as Record<string, number>,
        modifiers: {} as Record<string, number>,
        quantityAdjustments: 0,
        removals: 0,
        checkoutOpens: 0,
        paymentMethods: {} as Record<string, number>,
        placeOrderSuccess: 0,
        placeOrderErrors: {} as Record<string, number>,
        idleSessions: 0,
      };

      let scrollSum = 0;
      let scrollCount = 0;

      orderList.forEach(order => {
        const cb = order.customer_behavior;
        if (!cb) return;
        let payload: any = cb;
        if (typeof cb === 'string') {
          try {
            payload = JSON.parse(cb);
          } catch {
            return;
          }
        }

        const events = payload?.events || [];
        behaviorAgg.totalEvents += events.length;
        let sessionDeviceCounted = false;

        events.forEach((ev: any) => {
          const t = ev?.type;
          const p = ev?.payload || {};
          // scan / entry
          if (t === 'scan' || t === 'table_scan' || t === 'entry') {
            const rawTable = p.table_number || p.tableNumber || p.table_num || p.table || p.table_id || p.tableId;
            let tableLabel: string | undefined;
            if (typeof rawTable === 'number') {
              tableLabel = `Table ${rawTable}`;
            } else if (typeof rawTable === 'string') {
              const numeric = rawTable.trim().match(/\d+/)?.[0];
              if (numeric && numeric.length > 0) {
                tableLabel = `Table ${numeric}`;
              } else {
                tableLabel = rawTable;
              }
            }
            if (!tableLabel && typeof p.qr_source === 'string') {
              const numeric = p.qr_source.trim().match(/\d+/)?.[0];
              tableLabel = numeric ? `Table ${numeric}` : p.qr_source;
            }
            if (!tableLabel && typeof p.source === 'string') {
              const numeric = p.source.trim().match(/\d+/)?.[0];
              tableLabel = numeric ? `Table ${numeric}` : p.source;
            }
            if (tableLabel) behaviorAgg.tableScans[tableLabel] = (behaviorAgg.tableScans[tableLabel] || 0) + 1;
            const device = p.device || p.userAgent || p.ua || p.browser;
            if (device) {
              behaviorAgg.deviceTypes[device] = (behaviorAgg.deviceTypes[device] || 0) + 1;
              sessionDeviceCounted = true;
            }
          }

          // browsing
          if (t === 'category_view' || t === 'category_select' || t === 'category_filter') {
            const c = p.category || p.name;
            if (c) behaviorAgg.categoryViews[c] = (behaviorAgg.categoryViews[c] || 0) + 1;
            if (typeof c === 'string' && c.trim().length > 0) {
              behaviorAgg.topFilters[c.trim().toLowerCase()] = (behaviorAgg.topFilters[c.trim().toLowerCase()] || 0) + 1;
            }
          }
          if (t === 'item_view' || t === 'item_click' || t === 'view_item' || t === 'item_detail_view') {
            const name = p.name || p.itemName || p.title || p.itemName;
            if (name) behaviorAgg.itemViews[name] = (behaviorAgg.itemViews[name] || 0) + 1;
          }
          if (t === 'search' || t === 'search_input' || t === 'search_query') {
            const q = (p.query || p.q || p.term || p.search || p.value || '').toString().trim().toLowerCase();
            if (q) behaviorAgg.topSearches[q] = (behaviorAgg.topSearches[q] || 0) + 1;
          }

          // scroll
          if (t === 'scroll' && typeof p.percent === 'number') {
            scrollSum += p.percent;
            scrollCount++;
          }
          if (t === 'scroll_depth' && typeof p.scrollPercent === 'number') {
            scrollSum += p.scrollPercent;
            scrollCount++;
          }

          // cart actions
          if (t === 'add_to_cart' || t === 'cart_add') {
            const name = p.name || p.itemName || p.title || p.itemName;
            if (name) behaviorAgg.addToCart[name] = (behaviorAgg.addToCart[name] || 0) + 1;
          }
          if (t === 'modifier_select' || t === 'modifier') {
            const m = p.modifier || p.name;
            if (m) behaviorAgg.modifiers[m] = (behaviorAgg.modifiers[m] || 0) + 1;
          }
          if (t === 'quantity_change') {
            behaviorAgg.quantityAdjustments++;
          }
          if (t === 'remove_from_cart' || t === 'cart_remove') {
            behaviorAgg.removals++;
          }

          // checkout & payment
          if (t === 'checkout_open') behaviorAgg.checkoutOpens++;
          if (t === 'payment_method_selected') {
            const m = p.method || p.name;
            if (m) behaviorAgg.paymentMethods[m] = (behaviorAgg.paymentMethods[m] || 0) + 1;
          }
          if (t === 'place_order' && p.success) behaviorAgg.placeOrderSuccess++;
          if (t === 'place_order' && p.success === false) {
            const code = p.error_code || p.error || 'unknown';
            behaviorAgg.placeOrderErrors[code] = (behaviorAgg.placeOrderErrors[code] || 0) + 1;
          }

          // session end / idle
          if (t === 'session_abandoned') {
            behaviorAgg.abandonmentCount++;
          }
          if (t === 'idle' || t === 'idle_period') behaviorAgg.idleSessions++;

          // generic event count
        });

        const maxScroll = payload?.metadata?.maxScrollPercent;
        if (typeof maxScroll === 'number') {
          scrollSum += maxScroll;
          scrollCount++;
        }

        const metadataDevice = payload?.metadata?.deviceInfo?.device || payload?.metadata?.deviceInfo?.browser || payload?.metadata?.deviceInfo?.os;
        if (metadataDevice && !sessionDeviceCounted) {
          behaviorAgg.deviceTypes[metadataDevice] = (behaviorAgg.deviceTypes[metadataDevice] || 0) + 1;
        }
      });

      behaviorAgg.avgEventsPerSession = behaviorAgg.totalEvents / (orderList.length || 1);
      behaviorAgg.abandonmentRate = (behaviorAgg.abandonmentCount / (orderList.length || 1)) * 100;
      behaviorAgg.avgMaxScrollPercent = scrollCount > 0 ? scrollSum / scrollCount : 0;

      const topSearches = Object.entries(behaviorAgg.topSearches).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([q, c]) => ({ q, c }));
      const topFilters = Object.entries(behaviorAgg.topFilters).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, c]) => ({ f, c }));

      const topTables = Object.entries(behaviorAgg.tableScans).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, c]) => ({ id, c }));
      const topDevices = Object.entries(behaviorAgg.deviceTypes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, c]) => ({ id, c }));
      const topCategories = Object.entries(behaviorAgg.categoryViews).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cat, c]) => ({ cat, c }));
      const topItemViews = Object.entries(behaviorAgg.itemViews).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, c]) => ({ name, c }));
      const topAddToCart = Object.entries(behaviorAgg.addToCart).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, c]) => ({ name, c }));
      const topModifiers = Object.entries(behaviorAgg.modifiers).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m, c]) => ({ m, c }));
      const topPaymentMethods = Object.entries(behaviorAgg.paymentMethods).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m, c]) => ({ m, c }));
      const topOrderErrors = Object.entries(behaviorAgg.placeOrderErrors).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([e, c]) => ({ e, c }));


      const mostOrderedItemCounts: Record<string, number> = {};
      orderList.forEach(order => {
        const itemName = order.most_ordered_item;
        if (itemName) {
          mostOrderedItemCounts[itemName] = (mostOrderedItemCounts[itemName] || 0) + 1;
        }
      });
      const mostFrequentMostOrderedItem = Object.entries(mostOrderedItemCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      const itemSales: { [key: string]: { name: string, count: number } } = {};
      orderList.forEach(order => {
        order.items.forEach(item => {
          if (itemSales[item.menuItemId]) {
            itemSales[item.menuItemId].count += item.quantity;
          } else {
            itemSales[item.menuItemId] = { name: item.name, count: item.quantity };
          }
        });
      });

      const soldItems = Object.values(itemSales).sort((a, b) => b.count - a.count);
      const bestSellers = soldItems.slice(0, 5);
      const leastSellers = soldItems.length > 5 ? soldItems.slice(-5).reverse() : [];

      const itemPairCounts: { [pairKey: string]: { items: [string, string], count: number } } = {};
      orderList.forEach(order => {
        const uniqueItemNames = [...new Set(order.items.map(item => item.name))];
        if (uniqueItemNames.length > 1) {
          for (let i = 0; i < uniqueItemNames.length; i++) {
            for (let j = i + 1; j < uniqueItemNames.length; j++) {
              const pair = [uniqueItemNames[i], uniqueItemNames[j]].sort();
              const pairKey = pair.join('|');

              if (itemPairCounts[pairKey]) {
                itemPairCounts[pairKey].count++;
              } else {
                itemPairCounts[pairKey] = { items: [pair[0], pair[1]], count: 1 };
              }
            }
          }
        }
      });

      const frequentPairs = Object.values(itemPairCounts)
        .filter(pair => pair.count >= suggestionThreshold)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      let suggestions: SalesReportAnalyzerSummary["suggestions"] =
        frequentPairs.map(pair => ({
          items: pair.items as [string, string],
          count: pair.count,
          text: `"${pair.items[0]}" + "${pair.items[1]}"`,
          type: 'combo' as const,
        }));

      if (suggestions.length === 0 && Object.values(itemPairCounts).length > 0) {
        const fallbackPairs = Object.values(itemPairCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        suggestions = fallbackPairs.map(pair => ({
          items: pair.items as [string, string],
          count: pair.count,
          text: `"${pair.items[0]}" + "${pair.items[1]}"`,
          type: 'combo' as const,
        }));
      }

      // Generate promotional suggestions when no combo patterns are found
      if (suggestions.length === 0 && bestSellers.length > 0) {
        const promotionalSuggestions: SalesReportAnalyzerSummary["suggestions"] = [];
        
        // Buy 1 Take 1 on top seller
        promotionalSuggestions.push({
          items: [bestSellers[0].name] as [string],
          count: bestSellers[0].count,
          text: `Buy 1 Take 1 promotion on "${bestSellers[0].name}"`,
          type: 'promotion' as const,
        });

        // Bundle best sellers
        if (bestSellers.length >= 2) {
          promotionalSuggestions.push({
            items: [bestSellers[0].name, bestSellers[1].name] as [string, string],
            count: 0,
            text: `Bundle "${bestSellers[0].name}" with "${bestSellers[1].name}" at a discounted price`,
            type: 'promotion' as const,
          });
        }

        // Promote low sellers with top seller
        if (leastSellers.length > 0) {
          promotionalSuggestions.push({
            items: [bestSellers[0].name, leastSellers[0].name] as [string, string],
            count: 0,
            text: `Create a combo: Buy "${bestSellers[0].name}" get "${leastSellers[0].name}" at 50% off`,
            type: 'promotion' as const,
          });
        }

        // Quantity discount on top seller
        promotionalSuggestions.push({
          items: [bestSellers[0].name] as [string],
          count: 0,
          text: `Offer quantity discounts on "${bestSellers[0].name}" (e.g., Buy 2 Get 10% Off)`,
          type: 'promotion' as const,
        });

        suggestions = promotionalSuggestions;
      }

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        averageOrderDurationMs,
        averageSpendPerOrder,
        mostFrequentMostOrderedItem,
        bestSellers,
        leastSellers,
        suggestions,
        behaviorInsights: {
          summary: behaviorAgg,
          topSearches,
          topFilters,
          topTables,
          topDevices,
          topCategories,
          topItemViews,
          topAddToCart,
          topModifiers,
          topPaymentMethods,
          topOrderErrors,
        },
      };
    };

    const filterByDate = (orderList: Order[], start: Date, end: Date) =>
      orderList.filter(order => {
        const created = new Date(order.createdAt);
        return created >= start && created <= end;
      });

    const overallSummary = summarizeOrders(orders);

    const latestOrderDate = orders.length > 0
      ? new Date(Math.max(...orders.map(order => new Date(order.createdAt).getTime())))
      : new Date();

    const weeklyEnd = new Date(latestOrderDate);
    weeklyEnd.setHours(23, 59, 59, 999);
    const weeklyStart = new Date(weeklyEnd);
    weeklyStart.setDate(weeklyStart.getDate() - 6);
    weeklyStart.setHours(0, 0, 0, 0);
    const weeklySummary = summarizeOrders(filterByDate(orders, weeklyStart, weeklyEnd));

    const monthBase = selectedMonth ? new Date(`${selectedMonth}-01`) : new Date(latestOrderDate.getFullYear(), latestOrderDate.getMonth(), 1);
    const monthStart = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlySummary = summarizeOrders(filterByDate(orders, monthStart, monthEnd));

    // If user provided an explicit selectedStartDate/selectedEndDate, compute a "selected" summary
    let selectedSummary = overallSummary;
    if (selectedStartDate && selectedEndDate) {
      const s = new Date(selectedStartDate);
      const e = new Date(selectedEndDate);
      s.setHours(0,0,0,0);
      e.setHours(23,59,59,999);
      selectedSummary = summarizeOrders(filterByDate(orders, s, e));
    }

    return {
      overall: overallSummary,
      weekly: weeklySummary,
      monthly: monthlySummary,
      selected: selectedSummary,
    };
  }, [orders, suggestionThreshold, selectedMonth, selectedStartDate, selectedEndDate]);

  // Get the data to display based on analysisType
  const router = useRouter();

  const currentAnalysis = useMemo(() => {
    switch (analysisType) {
      case 'selected':
        // when 'selected' analysis is requested prefer the computed selected summary (if present)
        // otherwise fall back to overall
        return (analysis as any).selected ?? analysis.overall;
      case 'weekly':
        return analysis.weekly;
      case 'monthly':
        return analysis.monthly;
      case 'overall':
        return analysis.overall;
      default:
        return analysis.overall;
    }
  }, [analysis, analysisType]);

  const buildSuggestedMenuName = (suggestion: SalesReportAnalyzerSummary['suggestions'][number]) => {
    if (suggestion.type === 'combo' && suggestion.items.length === 2) {
      return `${suggestion.items[0]} + ${suggestion.items[1]} Combo`;
    }
    if (suggestion.type === 'promotion' && suggestion.items.length === 2) {
      return `${suggestion.items[0]} & ${suggestion.items[1]} Deal`;
    }
    if (suggestion.items.length === 1) {
      return `${suggestion.items[0]} Special`;
    }
    return 'Menu Combo';
  };

  const handleCreateMenu = (suggestion: SalesReportAnalyzerSummary['suggestions'][number]) => {
    const menuName = buildSuggestedMenuName(suggestion);
    router.push(`/business/menu?aiSuggestionName=${encodeURIComponent(menuName)}`);
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <FontAwesomeIcon icon={faChartLine} className="text-slate-300 text-4xl mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sales Data</h3>
        <p className="text-slate-500">No sales data available to analyze for this period.</p>
      </div>
    );
  }

  if (currentAnalysis.totalOrders === 0) {
    return (
      <div className="text-center py-16 px-4">
        <FontAwesomeIcon icon={faChartLine} className="text-slate-300 text-4xl mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Orders Found</h3>
        <p className="text-slate-500">No orders found for this period. Try selecting a different date range.</p>
      </div>
    );
  }

  const getPeriodLabel = () => {
    switch (analysisType) {
      case 'weekly':
        return 'Weekly Analysis';
      case 'monthly':
        return 'Monthly Analysis';
      case 'overall':
        return 'Overall Analysis';
      case 'selected':
        return 'Selected Range Analysis';
      default:
        return 'Analysis';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center mb-2">
          <FontAwesomeIcon icon={faChartLine} className="mr-3 text-blue-600" />
          {getPeriodLabel()}
        </h2>
        {dateRangeLabel && (
          <p className="text-sm text-slate-600">{dateRangeLabel}</p>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-300">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</h3>
            <div className="bg-green-100 rounded-full p-2">
              <FontAwesomeIcon icon={faDollarSign} className="text-green-600 text-sm" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">{formatCurrency(currentAnalysis.totalRevenue)}</p>
          <p className="text-xs text-slate-500">from {currentAnalysis.totalOrders} orders</p>
        </div>

        {/* Total Orders */}
        <div className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</h3>
            <div className="bg-blue-100 rounded-full p-2">
              <FontAwesomeIcon icon={faChartBar} className="text-blue-600 text-sm" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{currentAnalysis.totalOrders}</p>
          <p className="text-xs text-slate-500">transactions completed</p>
        </div>

        {/* Average Order Value */}
        <div className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Order Value</h3>
            <div className="bg-purple-100 rounded-full p-2">
              <FontAwesomeIcon icon={faStar} className="text-purple-600 text-sm" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">{formatCurrency(currentAnalysis.averageOrderValue)}</p>
          <p className="text-xs text-slate-500">per transaction</p>
        </div>

        {/* Avg Order Duration */}
        <div className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Order Duration</h3>
            <div className="bg-indigo-100 rounded-full p-2">
              <FontAwesomeIcon icon={faLightbulb} className="text-indigo-600 text-sm" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-indigo-600 mb-2">{formatDuration(currentAnalysis.averageOrderDurationMs)}</p>
          <p className="text-xs text-slate-500">from customer sessions</p>
        </div>
      </div>

      {currentAnalysis.behaviorInsights && (
        <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 rounded-3xl border border-slate-300 p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Customer Behavior</h3>
              <p className="text-sm text-slate-600">Insights driven from tracked customer sessions and menu interactions.</p>
            </div>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-600">Session behavior overview</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 mb-3">Abandonment Rate</p>
              <p className="text-3xl font-semibold text-rose-600">{(currentAnalysis.behaviorInsights?.summary?.abandonmentRate ?? 0).toFixed(1)}%</p>
              <p className="text-sm text-slate-500 mt-2">sessions ended without ordering</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 mb-3">Avg Events / Session</p>
              <p className="text-3xl font-semibold text-slate-900">{(currentAnalysis.behaviorInsights?.summary?.avgEventsPerSession ?? 0).toFixed(1)}</p>
              <p className="text-sm text-slate-500 mt-2">key interactions per visit</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 mb-3">Avg Max Scroll</p>
              <p className="text-3xl font-semibold text-slate-900">{Math.round(currentAnalysis.behaviorInsights?.summary?.avgMaxScrollPercent ?? 0)}%</p>
              <p className="text-sm text-slate-500 mt-2">menu depth reached</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 mb-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Top Tables</h4>
                  <p className="text-xs text-slate-500">Frequent table scan locations</p>
                </div>
                <span className="text-xs font-semibold text-slate-600">{currentAnalysis.behaviorInsights.topTables?.length ?? 0}</span>
              </div>
              <div className="space-y-3">
                {currentAnalysis.behaviorInsights.topTables?.slice(0, 5).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">{t.id}</span>
                    <span className="text-xs font-semibold text-slate-500">{t.c} scans</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-cyan-50 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Top Devices</h4>
                  <p className="text-xs text-slate-500">Most common browser/device types</p>
                </div>
                <span className="text-xs font-semibold text-slate-600">{currentAnalysis.behaviorInsights.topDevices?.length ?? 0}</span>
              </div>
              <div className="space-y-3">
                {currentAnalysis.behaviorInsights.topDevices?.slice(0, 5).map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="text-sm text-slate-800 truncate">{d.id}</span>
                    <span className="text-xs font-semibold text-slate-500">{d.c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 mb-6">
            <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Top Item Views</h4>
                  <p className="text-xs text-slate-500">Popular item detail clicks</p>
                </div>
                <span className="text-xs font-semibold text-slate-600">{currentAnalysis.behaviorInsights.topItemViews?.length ?? 0}</span>
              </div>
              <div className="space-y-3">
                {currentAnalysis.behaviorInsights.topItemViews?.slice(0, 5).map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="text-sm text-slate-800 truncate">{it.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{it.c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Top Add to Cart</h4>
                  <p className="text-xs text-slate-500">Highest cart intent items</p>
                </div>
                <span className="text-xs font-semibold text-slate-600">{currentAnalysis.behaviorInsights.topAddToCart?.length ?? 0}</span>
              </div>
              <div className="space-y-3">
                {currentAnalysis.behaviorInsights.topAddToCart?.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm text-slate-800 truncate">{a.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{a.c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {currentAnalysis.behaviorInsights?.topOrderErrors?.length > 0 && (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6">
                <h4 className="text-sm font-semibold text-rose-900 mb-3">Common Order Errors</h4>
                <p className="text-sm text-rose-700">{currentAnalysis.behaviorInsights.topOrderErrors.map((e: any) => `${e.e} (${e.c})`).join(', ')}</p>
              </div>
            )}
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
              <h4 className="text-sm font-semibold text-amber-900 mb-3">Suggested Actions</h4>
              <ul className="list-disc space-y-2 pl-5 text-sm text-amber-900">
                {currentAnalysis.behaviorInsights?.summary?.abandonmentRate > 20 ? (
                  <li>Simplify checkout flow and clarify payment instructions for faster conversions.</li>
                ) : (
                  <>
                    <li>Review top viewed items with low conversion and improve descriptions or pricing.</li>
                    <li>Simplify modifier options if users repeatedly adjust quantities or remove items.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {currentAnalysis.mostFrequentMostOrderedItem && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-slate-700">
          <p className="text-sm font-medium">Customer behavior insight:</p>
          <p className="mt-1 text-base sm:text-lg">
            Most frequently selected top item: <span className="font-semibold">{currentAnalysis.mostFrequentMostOrderedItem}</span>
          </p>
        </div>
      )}

      {/* Best Sellers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-xl font-bold mb-4 flex items-center text-slate-900">
          <div className="bg-amber-100 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faStar} className="text-amber-600" />
          </div>
          Top Selling Items
        </h3>
        {currentAnalysis.bestSellers.length > 0 ? (
          <div className="space-y-2">
            {currentAnalysis.bestSellers.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-transparent p-4 rounded-xl border border-amber-100 transition-all duration-200 hover:border-amber-300"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-900">{item.name}</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {item.count}
                  <span className="text-xs font-normal">sold</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-6">No sales data available</p>
        )}
      </div>

      {/* Least Sold Items */}
      {currentAnalysis.leastSellers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-4 flex items-center text-slate-900">
            <div className="bg-red-100 rounded-full p-2 mr-3">
              <FontAwesomeIcon icon={faChartBar} className="text-red-600" />
            </div>
            Items to Promote
          </h3>
          <div className="space-y-2">
            {currentAnalysis.leastSellers.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gradient-to-r from-red-50 to-transparent p-4 rounded-xl border border-red-100 transition-all duration-200 hover:border-red-300"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-900">{item.name}</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {item.count}
                  <span className="text-xs font-normal">sold</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            💡 These items have lower sales. Consider bundling them with top sellers or adjusting pricing/marketing.
          </p>
        </div>
      )}

      {/* Growth Suggestions */}
      {currentAnalysis.suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-4 flex items-center text-slate-900">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <FontAwesomeIcon icon={faLightbulb} className="text-blue-600" />
            </div>
            {currentAnalysis.suggestions.some(s => s.type === 'promotion') ? 'Growth Suggestions' : 'Combo Recommendations'}
          </h3>
          <div className="space-y-3">
            {currentAnalysis.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                      ✓
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 mb-1">
                      {suggestion.type === 'combo' ? 'Create a bundle: ' : ''}{suggestion.text}
                    </p>
                    <p className="text-sm text-slate-600">
                      {suggestion.type === 'combo' 
                        ? `These items are frequently purchased together (${suggestion.count} times). Bundle them to increase AOV and customer satisfaction.`
                        : suggestion.type === 'promotion'
                        ? 'This promotional strategy can help increase sales and customer engagement.'
                        : 'Implement this strategy to boost revenue.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => handleCreateMenu(suggestion)}
                      className="ml-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Create Menu
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Suggestions - Only show if absolutely no data */}
      {currentAnalysis.suggestions.length === 0 && currentAnalysis.totalOrders > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 text-center">
          <FontAwesomeIcon icon={faLightbulb} className="text-slate-400 text-2xl mb-2" />
          <p className="text-slate-600 text-sm">
            Not enough data to generate suggestions at this time.
          </p>
        </div>
      )}
    </div>
  );
}
