import { OrderData } from "@/utils/fetchActiveOrder";

type CartItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
};

interface Props {
  qrUrl: string;
  tableId: string | null;
  currentOrder: OrderData | null;
  orderStatus: string;
  cartItems: CartItem[];
  cartTotal: number;
}

export default function SlugSidebar({
  qrUrl,
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
      case "received":
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
      case "received":
        return "Order Received";
      case "ready":
        return "Preparing";
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
      case "received":
        return "w-[30%]";
      case "ready":
        return "w-[55%]";
      case "served":
        return "w-[80%]";
      case "completed":
        return "w-full";
      case "paid":
        return "w-[25%]"; // optional logic
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
      case "received":
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

  const downloadQR = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qr-code.png";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.open(qrUrl, "_blank");
    }
  };

  return (
    <aside className="space-y-6">
      {/* QR */}
      <div className="border border-gray-300 rounded-2xl bg-white shadow-lg p-5 text-center">
        <div className="mx-auto h-48 w-48 mb-4 rounded-lg overflow-hidden border border-gray-300 shadow-md">
          <img src={qrUrl} alt="Scan QR" className="w-full h-full object-cover" />
        </div>
        <p className="font-bold text-lg">SCAN THE QR</p>
        <button
          onClick={downloadQR}
          className="mt-4 w-full rounded-2xl bg-[#E23838] px-4 py-3 text-sm font-semibold text-white hover:bg-[#c22f2f] transition"
        >
          Download QR
        </button>
      </div>

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
                {currentOrder.status === "received" && "Order received, preparing soon"}
                {currentOrder.status === "ready" && "Your order is being prepared"}
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
                    <span className="text-red-600 font-semibold">₱{item.price}</span>
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
                    <span>• {item.name}</span>
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