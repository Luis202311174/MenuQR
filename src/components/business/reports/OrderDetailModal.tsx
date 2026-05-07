"use client";

import { DailySalesOrderRow } from "./DailyOrderDetailsModal";

export interface OrderDetailModalProps {
  order: DailySalesOrderRow | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (v: number) => string;
  normalizeOrderItems: (items: any) => any[];
}

export default function OrderDetailModal({
  order,
  isOpen,
  onClose,
  formatCurrency,
  normalizeOrderItems,
}: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const netTotal = (order.total_amount || 0) - (order.discount_amount || 0);

  const tableNumber =
    order.table?.table_number ??
    // some queries return table_number directly
    (order as any).table_number ??
    // some queries return table_id table number
    (order as any).table_id ??
    "N/A";


  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 py-8">
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center">
        <div className="flex w-full max-h-[85vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <div className="bg-slate-900 px-5 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Order detail</p>
                <h2 className="mt-1 text-lg font-bold text-white">Order #{order.id.slice(0, 8)}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
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
                  <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Time</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{order.status}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Total (Gross)</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(order.total_amount || 0)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Discount</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(order.discount_amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Net Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(netTotal)}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{order.customer_name || order.user_id || "Guest"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Table</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {tableNumber}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Discount detail</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {order.discount_amount ? formatCurrency(order.discount_amount) : "None"}
                  </p>
                  {(order.total_guests || order.senior_pwd_count) ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {order.senior_pwd_count || 0} Senior/PWD of {order.total_guests || 0} guests
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Payment information</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-700">
                    {order.payment_method ? order.payment_method.toUpperCase() : "CASH"}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-slate-600">Amount Paid</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(netTotal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600">Reference</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{order.gcash_ref || order.payment_reference || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Items ordered</h3>
                    <p className="text-[10px] text-slate-500">Review each item and subtotal.</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">{normalizeOrderItems(order.items).length} items</span>
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
                      {normalizeOrderItems(order.items).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-2 text-center text-slate-500">
                            No item details available for this order.
                          </td>
                        </tr>
                      ) : (
                        normalizeOrderItems(order.items).map((item: any, index: number) => {
                          const quantity = item.qty ?? item.quantity ?? 1;
                          const itemPrice = Number(item.price ?? item.base_price ?? 0);
                          const subtotal = itemPrice * quantity;
                          return (
                            <tr key={index}>
                              <td className="px-2 py-1 text-slate-900">{item.name || item.title || item.menu_item_id || "Item"}</td>
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
  );
}

