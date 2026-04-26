"use client";

export type DailySale = {
  id: string;
  date: string;
  total_orders: number;
  total_sales: number;
};

export type OrderReceipt = {
  id: string;
  items: any[];
  total_amount: number;
  created_at: string;
  table?: {
    table_number: string;
  } | null;
};

interface ReceiptModalProps {
  selectedDay: DailySale;
  selectedOrders: OrderReceipt[];
  loadingOrders: boolean;
  onClose: () => void;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const formatCurrency = (value: number) =>
  value.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

export default function ReceiptModal({
  selectedDay,
  selectedOrders,
  loadingOrders,
  onClose,
}: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
      {/* MODAL CARD */}
      <div className="w-full max-w-4xl h-[85vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER (fixed) */}
        <div className="bg-[#E23838] px-6 py-5 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Daily Receipt</h2>
          <p className="text-sm text-white/90">
            {formatDate(selectedDay.date)} · {selectedDay.total_orders} orders ·{" "}
            {formatCurrency(Number(selectedDay.total_sales))}
          </p>
        </div>

        {/* SUMMARY (fixed) */}
        <div className="p-6 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{formatDate(selectedDay.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="font-semibold text-[#E23838]">
                {formatCurrency(Number(selectedDay.total_sales))}
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {loadingOrders ? (
            <div className="text-center text-gray-500">
              Loading receipt details...
            </div>
          ) : selectedOrders.length === 0 ? (
            <div className="text-center text-gray-500">
              No completed orders found for this day.
            </div>
          ) : (
            selectedOrders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Order #{order.id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Table {order.table?.table_number || "N/A"}
                      </div>
                      <div className="text-lg font-bold text-[#E23838]">
                        {formatCurrency(Number(order.total_amount))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
                    {items.map((item, index) => {
                      // Normalize selected options (Foodpanda-safe)
                      let selectedOptions: any[] = [];

                      if (Array.isArray(item.selected_options)) {
                        selectedOptions = item.selected_options;
                      } else if (typeof item.selected_options === "string") {
                        try {
                          selectedOptions = JSON.parse(item.selected_options);
                        } catch {
                          selectedOptions = [];
                        }
                      } else if (Array.isArray(item.addons)) {
                        selectedOptions = item.addons;
                      } else if (Array.isArray(item.options)) {
                        // handle nested format
                        selectedOptions = item.options.flatMap((g: any) => g.options || []);
                      }

                      // Compute addons total
                      const itemAddonsTotal = selectedOptions.reduce(
                        (sum: number, opt: any) => sum + (opt.price_modifier || 0),
                        0
                      );

                      const itemBasePrice = item.base_price || item.price || 0;
                      const itemFinalPrice = itemBasePrice + itemAddonsTotal;
                      const itemQty = item.quantity || item.qty || 1;
                      const itemTotal = itemFinalPrice * itemQty;

                      return (
                        <div
                          key={index}
                          className="border-b border-gray-200 pb-3 last:border-b-0"
                        >
                          {/* Item Name & Quantity */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {item.name ?? "Item"}
                              </p>
                              <p className="text-xs text-gray-500">
                                ₱{itemBasePrice.toFixed(2)}
                              </p>
                            </div>
                            <span className="ml-2 text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                              x{itemQty}
                            </span>
                          </div>

                          {/* Selected Options */}
                          {selectedOptions.length > 0 && (
                            <div className="ml-3 space-y-1 mb-2">
                              {selectedOptions.map((opt: any, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className="flex justify-between text-xs text-gray-600"
                                >
                                  {opt.group_name || opt.group || "Option"}:{" "}
                                  <span className="text-gray-700 font-medium">
                                    {opt.option_name || opt.name || "Choice"}
                                  </span>
                                  {opt.price_modifier > 0 && (
                                    <span className="text-gray-700 font-medium">
                                      +₱{opt.price_modifier.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Item Total */}
                          <div className="flex justify-end text-sm font-semibold text-gray-900">
                            {formatCurrency(itemTotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER (fixed action) */}
        <div className="p-4 border border-gray-300 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#E23838] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c22f2f] transition"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
}