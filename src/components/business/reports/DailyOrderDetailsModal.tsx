"use client";

export interface DailySalesOrderRow {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  user_id?: string;
  items?: any;
  table?: { table_number?: string | number | null };
  table_id?: string;
  discount_amount?: number | null;
  total_guests?: number | null;
  senior_pwd_count?: number | null;
  customer_name?: string | null;
  payment_method?: string | null;
  gcash_ref?: string | null;
  payment_reference?: string | null;
}

export interface DailySalesDataRow {
  date: string;
  orders: DailySalesOrderRow[];
  totalSales: number;
  totalOrders: number;
}

export interface DailyOrderDetailsModalProps {
  daily: DailySalesDataRow | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderDetail: (order: DailySalesOrderRow) => void;
  formatCurrency: (v: number) => string;


}

export default function DailyOrderDetailsModal({
  daily,
  isOpen,
  onClose,
  onOpenOrderDetail,
  formatCurrency,
}: DailyOrderDetailsModalProps) {
  if (!isOpen || !daily) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <div className="bg-slate-900 px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Order details</p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {new Date(daily.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  {daily.orders.length} order{daily.orders.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
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
                    {daily.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{order.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(order.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{order.status}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(order.discount_amount || 0)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency((order.total_amount || 0) - (order.discount_amount || 0))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenOrderDetail(order)}
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
  );
}

