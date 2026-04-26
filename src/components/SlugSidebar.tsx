import { OrderData } from "@/utils/fetchActiveOrder";

type CartItem = {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  category?: string;
  qty: number;
  base_price: number;
  total?: number;
  selected_options?: {
    group_name: string;
    option_name: string;
    price_modifier: number;
  }[];
  selectedOptions?: {
    group_name: string;
    option_name: string;
    price_modifier: number;
  }[];
  addonsTotal?: number;
};

interface Props {
  tableId: string | null;
  currentOrder: OrderData | null;
  orderStatus: string;
  cartItems: CartItem[];
  cartTotal: number;
}

export default function SlugSidebar({
  tableId,
  currentOrder,
  orderStatus,
  cartItems,
  cartTotal,
}: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "pending_payment":
        return "bg-orange-100 text-orange-800";
      case "received":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-indigo-100 text-indigo-800";
      case "served":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "paid":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Unpaid";
      case "pending_payment":
        return "Pending Payment";
      case "received":
        return "Order Received";
      case "preparing":
        return "Preparing Your Food";
      case "ready":
        return "Ready to Serve";
      case "served":
        return "Served";
      case "completed":
        return "Completed";
      case "paid":
        return "Paid";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getProgressWidth = (status: string) => {
    switch (status) {
      case "pending":
        return "w-[10%]";
      case "pending_payment":
        return "w-[15%]";
      case "paid":
        return "w-[25%]";
      case "received":
        return "w-[30%]";
      case "preparing":
        return "w-[50%]"; // ✅ NEW
      case "ready":
        return "w-[70%]"; // shifted forward
      case "served":
        return "w-[90%]";
      case "completed":
        return "w-full";
      case "cancelled":
        return "w-full";
      default:
        return "w-0";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "pending_payment":
        return "bg-orange-500";
      case "received":
        return "bg-blue-500";
      case "preparing":
        return "bg-blue-500";
      case "ready":
        return "bg-indigo-500";
      case "served":
        return "bg-green-500";
      case "completed":
        return "bg-purple-500";
      case "paid":
        return "bg-emerald-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getItemTotal = (item: CartItem) => {
    // 1. If backend already computed total → always trust it
    if (typeof item.total === "number") return item.total;

    // 2. fallback: base price × qty
    return item.price * (item.qty || 1);
  };

  return (
    <aside className="space-y-6">
      {tableId && (
        <p className="text-sm text-green-600 font-semibold bg-green-50 p-3 rounded-lg border border-green-200 shadow-sm">
          ✓ Table Connected 🍽️
        </p>
      )}

      {/* Orders */}
      <div className="border border-gray-300 rounded-2xl bg-white shadow-lg p-5">
        <h3 className="font-bold text-lg mb-1">📋 Order</h3>

        {currentOrder ? (
          <div className="space-y-3">
            <div className="mb-3 pb-3 border-b border-gray-200">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">
                Status & Progress
              </p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(
                  currentOrder.status
                )}`}
              >
                {getStatusText(currentOrder.status)}
              </span>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    currentOrder.status
                  )} ${getProgressWidth(currentOrder.status)}`}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {currentOrder.status === "pending" && "Please pay at the counter"}
                {currentOrder.status === "pending_payment" && "Waiting for payment confirmation"}
                {currentOrder.status === "received" && "Order received, preparing soon"}
                {currentOrder.status === "preparing" && "Your food is being cooked"}
                {currentOrder.status === "ready" && "Your order is ready to be served"}
                {currentOrder.status === "served" && "Order has been served"}
                {currentOrder.status === "completed" && "Order complete. Thank you!"}
                {currentOrder.status === "paid" && "Payment confirmed"}
                {currentOrder.status === "cancelled" && "Order has been cancelled"}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">Order ID</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded border border-gray-200">
                {currentOrder.id.slice(0, 8)}...
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">Items</p>
              <div className="space-y-1">
                {currentOrder.items.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-700 flex justify-between">
                    <span>• {item.name}</span>
                    <span className="text-red-600 font-semibold">
                      ₱{Number(item.total ?? (item.price * (item.qty || 1))).toFixed(2)}
                    </span>
                  </p>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">
                Total Amount
              </p>
              <p className="text-2xl font-black text-[#E23838]">
                ₱{currentOrder.total_amount?.toFixed(2)}
              </p>
            </div>
          </div>
        ) : cartItems.length > 0 ? (
          <div className="space-y-3">
            <div className="mb-3 pb-3 border-b border-gray-200">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Your Cart</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-800">
                Ready to Order
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">
                Items ({cartItems.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {cartItems.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-700 flex justify-between">
                    <span>• {item.name} x{item.qty || 1}</span>
                    <span className="text-red-600 font-semibold">₱{item.price}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">
                Total Amount
              </p>
              <p className="text-2xl font-black text-[#E23838]">₱{cartTotal.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No items in cart</p>
            <p className="text-xs text-gray-400 mt-2">Add items from the menu to get started</p>
          </div>
        )}
      </div>
    </aside>
  );
}