"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faFilter } from "@fortawesome/free-solid-svg-icons";
import { useMemo } from "react";

type DailySalesOrderRow = {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  user_id?: string;
  table_id?: string;
  items?: any;
  table?: { table_number?: string | number | null };
  discount_amount?: number | null;
};

type DailySalesDataRow = {
  date: string;
  orders: DailySalesOrderRow[];
  totalSales: number;
  totalOrders: number;
};

export interface DailySalesReportModalProps {
  isOpen: boolean;
  selectedStartDate: string;
  selectedEndDate: string;
  onChangeStartDate: (v: string) => void;
  onChangeEndDate: (v: string) => void;
  loadingDailyReport: boolean;
  dailySalesData: DailySalesDataRow[];
  timeRangeLabel?: string;
  onSearch: () => void;
  onReset: () => void;
  onClose: () => void;
  onSelectDay: (row: DailySalesDataRow) => void;
  formatCurrency: (value: number) => string;
}

export default function DailySalesReportModal({
  isOpen,
  selectedStartDate,
  selectedEndDate,
  onChangeStartDate,
  onChangeEndDate,
  loadingDailyReport,
  dailySalesData,
  onSearch,
  onReset,
  onClose,
  onSelectDay,
  formatCurrency,
}: DailySalesReportModalProps) {
  const reportSummary = useMemo(() => {
    const totalSales = dailySalesData.reduce((sum, day) => sum + (day.totalSales || 0), 0);
    const totalOrders = dailySalesData.reduce((sum, day) => sum + (day.totalOrders || 0), 0);
    const totalDays = dailySalesData.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      totalDays,
      averageOrderValue,
    };
  }, [dailySalesData]);

  const dateRangeLabel = `${selectedStartDate} – ${selectedEndDate}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-8">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-black/10">
        {/* Header - Fixed */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 sm:px-8 sm:py-5 flex-shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Daily Sales Report</p>
              <h2 className="text-2xl font-bold text-slate-900">Orders by Date</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Use the calendar filter to search specific date ranges. Expand each date to inspect orders and view the items customers ordered.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-sm text-slate-600">
                <span className="mb-1 font-medium text-slate-700">From</span>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => onChangeStartDate(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-600">
                <span className="mb-1 font-medium text-slate-700">To</span>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => onChangeEndDate(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>
            <div className="flex items-end justify-between gap-3">
              <button
                type="button"
                onClick={onSearch}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                Search
              </button>
              <button
                type="button"
                onClick={onReset}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary Cards */}
          <div className="px-6 py-5 sm:px-8 border-b border-slate-200">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Range</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{dateRangeLabel}</p>
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

          {/* Table */}
          <div className="px-0 py-4 sm:px-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
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
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {new Date(daily.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-900">{formatCurrency(daily.totalSales)}</td>
                        <td className="px-4 py-4 text-right text-slate-900">{daily.totalOrders}</td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectDay(daily)}
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
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8 text-sm text-slate-600 flex-shrink-0">
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
  );
}

