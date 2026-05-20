import React, { useState, useEffect } from "react";
import { OrderData } from "@/utils/fetchActiveOrder";
import OrderRatingModal from "./OrderRatingModal";

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  category?: string;
  qty: number;
  base_price: number;
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
  total?: number;
}

interface OrdersButtonProps {
  cartItems: CartItem[];
  cartTotal: number;
  orderStatus: string;
  isDineIn: boolean;
  submittingOrder: boolean;
  onSubmitOrder: () => void;
  onRemoveItem: (index: number) => void;
  currentOrder?: OrderData | null;
  sessionOrders?: OrderData[];
  unpaidOrders?: OrderData[];
  onPayBill?: () => void;
  badgeCount?: number;
  paymentSettings?: {
    cash: boolean;
    gcash: boolean;
  };
  sessionId: string;
  businessId: string;
  businessName?: string;
  tableId?: string;
  orderCompleteModal?: boolean;
  onPaymentComplete?: (method: "cash" | "gcash") => void;
  completedOrder?: OrderData | null;
  onCloseOrderCompleteModal?: () => void;
  showOrderMoreModal?: boolean;
  onCloseOrderMoreModal?: () => void;
  onSubmitAndPay?: () => Promise<void>;
}

const OrdersButton: React.FC<OrdersButtonProps> = ({
  orderCompleteModal,
  completedOrder,
  onCloseOrderCompleteModal,
  businessId,
}) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratedOrder, setRatedOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    if (orderCompleteModal && completedOrder) {
      setRatedOrder(completedOrder);
      setShowRatingModal(true);
    } else if (!orderCompleteModal) {
      setShowRatingModal(false);
      setRatedOrder(null);
    }
  }, [orderCompleteModal, completedOrder]);

  const handleRatingModalClose = () => {
    setShowRatingModal(false);
    setRatedOrder(null);
  };

  return (
    <>
      {orderCompleteModal && completedOrder && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-blue-600 px-6 py-5">
              <h2 className="text-2xl font-bold text-white">Order Complete</h2>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-700 text-lg font-semibold">Thank you for ordering!</p>
              <p className="text-gray-600">Your order has been completed.</p>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm uppercase tracking-wider text-gray-500">Order ID</p>
                  <p className="font-semibold text-gray-800">{completedOrder.id.slice(0, 8)}...</p>
                </div>

                <div className="space-y-2">
                  {completedOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm text-gray-700">
                      <span>{item.name}</span>
                      <span className="font-semibold text-blue-600">₱{item.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-700">
                    ₱{(Number(completedOrder.total_amount) + Number(completedOrder.discount_amount || 0)).toFixed(2)}
                  </span>
                </div>

                {(completedOrder.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Senior/PWD Discount</span>
                    <span className="text-sm font-semibold text-green-600">
                      -₱{Number(completedOrder.discount_amount ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₱{Number(completedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onCloseOrderCompleteModal}
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <OrderRatingModal
        open={showRatingModal}
        orderId={ratedOrder?.id || ""}
        businessId={businessId}
        onClose={handleRatingModalClose}
        onRated={() => console.log("Thanks for rating!")}
      />
    </>
  );
};

export default OrdersButton;
