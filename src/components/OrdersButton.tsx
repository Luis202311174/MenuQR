import React, { useState, useEffect } from "react";
import { OrderData } from "@/utils/fetchActiveOrder";
import { supabase } from "@/lib/supabaseClient";
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
  const [rewardCouponInfo, setRewardCouponInfo] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    expires_at: string | null;
    description?: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkExistingRating = async () => {
      if (orderCompleteModal && completedOrder?.id) {
        const { data, error } = await supabase
          .from("order_ratings")
          .select("id")
          .eq("order_id", completedOrder.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("Error checking existing order rating:", error);
          setShowRatingModal(true);
          setRatedOrder(completedOrder);
          return;
        }

        if (data) {
          // Order already has a rating, don’t show the rating modal again.
          setShowRatingModal(false);
          setRatedOrder(null);
          return;
        }

        setRatedOrder(completedOrder);
        setShowRatingModal(true);
      } else {
        setShowRatingModal(false);
        setRatedOrder(null);
      }
    };

    checkExistingRating();

    return () => {
      mounted = false;
    };
  }, [orderCompleteModal, completedOrder]);

  const handleRatingModalClose = () => {
    setShowRatingModal(false);
    setRatedOrder(null);
  };

  useEffect(() => {
    let mounted = true;

    const fetchRewardCoupon = async () => {
      const couponCode = completedOrder?.milestone_coupon_code ?? completedOrder?.reward_coupon_code;
      if (!couponCode || !businessId) {
        setRewardCouponInfo(null);
        return;
      }

      const { data, error } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value, expires_at, description")
        .eq("business_id", businessId)
        .eq("code", couponCode)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Error loading reward coupon details:", error);
        setRewardCouponInfo(null);
        return;
      }

      setRewardCouponInfo(data || null);
    };

    fetchRewardCoupon();

    return () => {
      mounted = false;
    };
  }, [completedOrder?.milestone_coupon_code, completedOrder?.reward_coupon_code, businessId]);

  return (
    <>
      {orderCompleteModal && completedOrder && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-blue-600 px-3 py-3 sm:px-6 sm:py-5 flex-shrink-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white">Order Complete</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
                <p className="text-gray-700 text-sm sm:text-lg font-semibold">Thank you for ordering!</p>
                <p className="text-xs sm:text-sm text-gray-600">Your order has been completed.</p>

                <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:p-4">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <p className="text-xs uppercase tracking-wider text-gray-500">Order ID</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">{completedOrder.id.slice(0, 8)}...</p>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    {completedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs sm:text-sm text-gray-700">
                        <span className="truncate">{item.name}</span>
                        <span className="font-semibold text-blue-600 flex-shrink-0 ml-2">₱{item.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 sm:mt-4 border-t border-gray-200 pt-2 sm:pt-3 flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-500">Subtotal</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">
                      ₱{(Number(completedOrder.total_amount) + Number(completedOrder.discount_amount || 0)).toFixed(2)}
                    </span>
                  </div>

                  {(completedOrder.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-green-600">
                        {completedOrder.coupon_id
                          ? "Coupon Discount"
                          : completedOrder.senior_pwd_count
                            ? "Senior/PWD Discount"
                            : "Discount"}
                      </span>
                      <span className="font-semibold text-green-600">
                        -₱{Number(completedOrder.discount_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-1 sm:pt-2 flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-500">Total</span>
                    <span className="text-base sm:text-lg font-bold text-blue-600">
                      ₱{Number(completedOrder.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {rewardCouponInfo && (
                  <div className="rounded-2xl sm:rounded-3xl border border-emerald-200 bg-emerald-50 p-3 sm:p-5">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-emerald-100 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-semibold text-emerald-800">
                          🎉 Reward Coupon Earned
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700">You earned a coupon for your next order.</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(rewardCouponInfo.code)}
                        className="rounded-lg sm:rounded-2xl bg-emerald-700 px-2 py-1 sm:px-4 sm:py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 flex-shrink-0"
                      >
                        Copy Code
                      </button>
                    </div>
                    <div className="mt-2 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                      <div className="rounded-lg sm:rounded-2xl bg-white p-2 sm:p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Coupon Code</p>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 break-all">{rewardCouponInfo.code}</p>
                      </div>
                      <div className="rounded-lg sm:rounded-2xl bg-white p-2 sm:p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Reward</p>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900">
                          {rewardCouponInfo.discount_type === 'percentage'
                            ? `${rewardCouponInfo.discount_value}% OFF`
                            : `₱${rewardCouponInfo.discount_value.toFixed(2)} OFF`}
                        </p>
                      </div>
                      <div className="rounded-lg sm:rounded-2xl bg-white p-2 sm:p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Valid Until</p>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900">
                          {rewardCouponInfo.expires_at
                            ? new Date(rewardCouponInfo.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No expiry'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-4 rounded-lg sm:rounded-2xl border border-amber-300 bg-amber-50 p-2 sm:p-3">
                      <p className="text-xs font-semibold text-amber-900 flex items-start gap-1 sm:gap-2">
                        <span className="text-sm sm:text-base flex-shrink-0">⚠️</span>
                        <span>Screenshot or save this code now. You'll need it for your next order!</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 p-3 sm:p-6 flex justify-end flex-shrink-0 bg-white">
              <button
                onClick={onCloseOrderCompleteModal}
                className="rounded-lg sm:rounded-2xl border border-gray-300 px-3 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <OrderRatingModal
        open={showRatingModal}
        orderId={ratedOrder?.id || ""}
        businessId={businessId}
        rewardCouponInfo={rewardCouponInfo}
        onClose={handleRatingModalClose}
        onRated={() => console.log("Thanks for rating!")}
      />
    </>
  );
};

export default OrdersButton;
