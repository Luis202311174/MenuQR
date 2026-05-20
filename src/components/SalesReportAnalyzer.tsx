"use client";

import React, { useMemo } from 'react';
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
  total: number;
}

interface SalesReportAnalyzerSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  bestSellers: { name: string; count: number }[];
  leastSellers: { name: string; count: number }[];
  suggestions: string[];
}

interface SalesReportAnalyzerProps {
  orders: Order[];
  // A threshold for how many times a pair must be bought together to be "frequent"
  suggestionThreshold?: number;
  analysisType?: 'selected' | 'weekly' | 'monthly' | 'overall';
  selectedMonth?: string;
  dateRangeLabel?: string;
}

// A helper function to format currency, consistent with other components
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export default function SalesReportAnalyzer({ 
  orders, 
  suggestionThreshold = 1,
  analysisType = 'selected',
  selectedMonth,
  dateRangeLabel,
}: SalesReportAnalyzerProps) {
  const analysis = useMemo(() => {
    const summarizeOrders = (orderList: Order[]) => {
      if (!orderList || orderList.length === 0) {
        return {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          bestSellers: [],
          leastSellers: [],
          suggestions: [],
        };
      }

      const totalRevenue = orderList.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = orderList.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

      let suggestions = frequentPairs.map(pair => ({
        items: pair.items,
        count: pair.count,
        text: `"${pair.items[0]}" + "${pair.items[1]}"`,
      }));

      if (suggestions.length === 0 && Object.values(itemPairCounts).length > 0) {
        const fallbackPairs = Object.values(itemPairCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        suggestions = fallbackPairs.map(pair => ({
          items: pair.items,
          count: pair.count,
          text: `"${pair.items[0]}" + "${pair.items[1]}"`,
        }));
      }

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        bestSellers,
        leastSellers,
        suggestions,
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

    return {
      overall: overallSummary,
      weekly: weeklySummary,
      monthly: monthlySummary,
    };
  }, [orders, suggestionThreshold, selectedMonth]);

  // Get the data to display based on analysisType
  const currentAnalysis = useMemo(() => {
    switch (analysisType) {
      case 'selected':
        return analysis.overall;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

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
            Combo Recommendations
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
                      Create a bundle: {suggestion.text}
                    </p>
                    <p className="text-sm text-slate-600">
                      These items are frequently purchased together ({suggestion.count} times). Bundle them to increase AOV and customer satisfaction.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Suggestions */}
      {currentAnalysis.suggestions.length === 0 && currentAnalysis.totalOrders > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 text-center">
          <FontAwesomeIcon icon={faLightbulb} className="text-slate-400 text-2xl mb-2" />
          <p className="text-slate-600 text-sm">
            No strong combo patterns found in this period. If your selected range contains mostly single-item sales, bundle recommendations will appear when multi-item orders are present.
          </p>
        </div>
      )}
    </div>
  );
}
