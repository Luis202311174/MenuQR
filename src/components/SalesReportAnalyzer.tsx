"use client";

import React, { useMemo } from 'react';
import { faChartLine, faLightbulb, faStar, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
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
  suggestionThreshold = 5,
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
        .sort((a, b) => b.count - a.count);

      const suggestions = frequentPairs.map(pair => 
        `Customers frequently purchase "${pair.items[0]}" and "${pair.items[1]}" together. Consider creating a combo deal to boost sales.`
      );

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
      ...overallSummary,
      weekly: weeklySummary,
      monthly: monthlySummary,
    };
  }, [orders, suggestionThreshold, selectedMonth]);

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-gray-100 text-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Sales Analyzer</h2>
        <p>No sales data available to analyze.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100/50 text-slate-900 p-4 sm:p-8 rounded-2xl shadow-inner border border-slate-200 space-y-12">
      <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2 flex items-center justify-center text-slate-800">
        <FontAwesomeIcon icon={faChartLine} className="mr-4" />
        Sales & Performance Analyzer
      </h2>
      {dateRangeLabel && (
        <p className="text-center text-sm text-slate-500 mb-2">{dateRangeLabel}</p>
      )}
      <p className="text-center text-xs uppercase tracking-wide text-slate-400 mb-4">
        {analysisType === 'selected' ? 'Selected range review' : analysisType === 'weekly' ? 'Weekly summary' : analysisType === 'monthly' ? 'Monthly summary' : 'Overall business review'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Weekly review</h3>
          {analysis.weekly.totalOrders > 0 ? (
            <>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(analysis.weekly.totalRevenue)}</p>
              <p className="text-sm text-slate-600 mt-2">{analysis.weekly.totalOrders} orders · AOV {formatCurrency(analysis.weekly.averageOrderValue)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No orders found for this week.</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Monthly review</h3>
          {analysis.monthly.totalOrders > 0 ? (
            <>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(analysis.monthly.totalRevenue)}</p>
              <p className="text-sm text-slate-600 mt-2">{analysis.monthly.totalOrders} orders · AOV {formatCurrency(analysis.monthly.averageOrderValue)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No orders found for this month.</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Overall review</h3>
          {analysis.totalOrders > 0 ? (
            <>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(analysis.totalRevenue)}</p>
              <p className="text-sm text-slate-600 mt-2">{analysis.totalOrders} orders · AOV {formatCurrency(analysis.averageOrderValue)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No overall orders available yet.</p>
          )}
        </div>
      </div>

      {/* Business Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">{formatCurrency(analysis.totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider">Total Orders</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{analysis.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider">Average Order Value</h3>
          <p className="text-4xl font-bold text-purple-600 mt-2">{formatCurrency(analysis.averageOrderValue)}</p>
        </div>
      </div>

      {/* Best & Least Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            <FontAwesomeIcon icon={faStar} className="text-yellow-500 mr-3" />
            Best Sellers
          </h3>
          <ul className="space-y-3">
            {analysis.bestSellers.map((item, index) => (
              <li key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                <span className="font-medium">{item.name}</span>
                <span className="font-bold text-lg">{item.count} sold</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            <FontAwesomeIcon icon={faThumbsDown} className="text-red-500 mr-3" />
            Least Sold Items
          </h3>
          {analysis.leastSellers.length > 0 ? (
            <ul className="space-y-3">
              {analysis.leastSellers.map((item, index) => (
                <li key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-bold text-lg">{item.count} sold</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Not enough item diversity to determine least sellers.</p>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <FontAwesomeIcon icon={faLightbulb} className="text-yellow-400 mr-3" />
          Growth Suggestions
        </h3>
        {analysis.suggestions.length > 0 ? (
          <ul className="space-y-4">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-slate-800">{suggestion}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Not enough data to generate combo suggestions. Try lowering the threshold or wait for more orders.</p>
        )}
      </div>
    </div>
  );
}
