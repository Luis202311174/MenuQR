import React, { useState, useMemo, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faShoppingCart, faReceipt, faQrcode, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import { OrderData } from "@/utils/fetchActiveOrder";
import { getOrderStatusLabel, getStatusColor } from "@/utils/orderStatusManager";
import { storeSessionReceipt } from "@/utils/receiptManager";
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
  cartItems,
  cartTotal,
  orderStatus,
  isDineIn,
  submittingOrder,
  onSubmitOrder,
  onRemoveItem,
  currentOrder,
  sessionOrders = [],
  unpaidOrders = [],
  onPayBill,
  showOrderMoreModal = false,
  onCloseOrderMoreModal,
  onSubmitAndPay,  // ADD THIS
  badgeCount,
  sessionId,
  businessId,
  orderCompleteModal,
  completedOrder,
  onCloseOrderCompleteModal,
  tableId,
  paymentSettings,
  onPaymentComplete,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "status" | "receipts">("cart");
  const [showOrderAgainModal, setShowOrderAgainModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gcash" | "cash" | null>(null);
  const [orderMoreHandled, setOrderMoreHandled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshOrders = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratedOrder, setRatedOrder] = useState<OrderData | null>(null);

  // Open rating modal whenever the order-complete modal is shown
  useEffect(() => {
    if (orderCompleteModal && completedOrder) {
      setRatedOrder(completedOrder);
      setShowRatingModal(true);
    }
  }, [orderCompleteModal, completedOrder]);

  useEffect(() => {
    if (showOrderMoreModal) {
      setOrderMoreHandled(false);
    }
  }, [showOrderMoreModal]);

  const enabledMethods = useMemo(() => {
    return {
      cash: paymentSettings?.cash ?? true,
      gcash: paymentSettings?.gcash ?? false,
    };
  }, [paymentSettings]);

  const openPaymentFlow = () => {
    const cashEnabled = paymentSettings?.cash ?? true;
    const gcashEnabled = paymentSettings?.gcash ?? false;

    const available = [cashEnabled, gcashEnabled].filter(Boolean).length;

    if (available === 0) {
      alert("No payment methods available");
      return;
    }

    if (available === 1) {
      const method = cashEnabled ? "cash" : "gcash";
      handlePaymentMethodSelect(method);
      return;
    }

    setShowPaymentModal(true);
  };

  useEffect(() => {
    const paidOrder = sessionOrders.find(o => o.is_paid || o.status === "paid");

    if (paidOrder) {
      setShowPaymentModal(false);
      setPaymentFeedback(null);
      setProcessingPayment(false);
      setOpen(false);
    }
  }, [sessionOrders]);

  const computedUnpaidOrders = useMemo(() => {
    console.log("SESSION ORDERS:",JSON.stringify(sessionOrders));
    return sessionOrders.filter((order) => !order.is_paid);
  }, [sessionOrders]);

  const unpaidTotal = useMemo(() => {
    console.log("SESSION ORDERS:",JSON.stringify(sessionOrders));
    return computedUnpaidOrders.reduce(
      (sum, order) => sum + Number(order.total_amount),
      0
    );
  }, [computedUnpaidOrders]);
  const sessionTotal = sessionOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  
  console.log("UNPAID ORDERS:", unpaidOrders);
  console.log("UNPAID TOTAL:", unpaidTotal);

  // Check if there are any served orders
  const servedOrders = sessionOrders.filter((order) => order.status === "served");
  const shouldShowOrderAgainPrompt =
    servedOrders.length > 0 &&
    cartItems.length === 0 &&
    computedUnpaidOrders.length === 0;

  // 🔹 derive displayedStatus from currentOrder
  const displayedStatus = useMemo(() => {
    console.log("SESSION ORDERS:",JSON.stringify(sessionOrders));
    return currentOrder ? currentOrder.status : orderStatus;
  }, [currentOrder, orderStatus]);

  const handleOrderMore = (wantsMore: boolean) => {
    onCloseOrderMoreModal?.(); // ALWAYS close first

    if (!wantsMore) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentMethodSelect = async (method: "gcash" | "cash") => {
    if (!sessionId || !businessId) {
      alert("Session information missing");
      return;
    }

    onCloseOrderMoreModal?.();

    setProcessingPayment(true);
    setPaymentFeedback(null);

    try {
      setSelectedPaymentMethod(method);

      await supabase
        .from("orders")
        .update({
          payment_method: method,
          status: "pending_payment",
        })
        .eq("session_id", sessionId)
        .eq("is_paid", false);

        refreshOrders();

      setPaymentFeedback(
        method === "gcash"
          ? "GCash selected. Waiting for restaurant confirmation."
          : "Cash selected. Waiting for restaurant confirmation."
      );
    } catch (error) {
      console.error("Payment selection error:", error);
      alert("Something went wrong.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[999] w-14 h-14 rounded-full bg-[#E23838] text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition sm:bottom-6 sm:right-6 sm:w-16 sm:h-16"
      >
        <FontAwesomeIcon icon={faClipboardList} size="lg" />
        {badgeCount && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#E23838] px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {activeTab === "cart" ? "Your Cart" : "Order Status"}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white font-bold px-3 py-1 border border-white rounded hover:bg-white hover:text-[#E23838]"
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 ${
                  activeTab === "cart" ? "font-bold border-b-2" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("cart")}
              >
                <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
                Cart
              </button>
              <button
                className={`flex-1 py-2 ${
                  activeTab === "status" ? "font-bold border-b-2" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("status")}
              >
                <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                Status
              </button>
              <button
                className={`flex-1 py-2 ${
                  activeTab === "receipts" ? "font-bold border-b-2" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("receipts")}
              >
                <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                Receipts
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* CART */}
              {activeTab === "cart" && (
                <>
                  {cartItems.length ? (
                    <>
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            {/* Show selected options if they exist */}
                            {((item.selectedOptions && item.selectedOptions.length) ||
                              (item.selected_options && item.selected_options.length)) ? (
                              <p className="text-xs text-gray-600 mt-1">
                                {(item.selectedOptions || item.selected_options)!
                                  .map((opt) => opt.option_name)
                                  .join(", ")}
                              </p>
                            ) : null}
                            <p className="text-xs text-gray-600 mt-1">
                              Qty: {item.qty ?? 1}
                            </p>
                            <p className="text-sm text-gray-700 font-bold">
                              ₱{Number(item.total ?? (item.price * (item.qty || 1))).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => onRemoveItem(idx)}
                            className="text-red-600 hover:text-red-800 px-2"
                          >
                            ✖
                          </button>
                        </div>
                      ))}

                      <hr />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₱{cartTotal.toFixed(2)}</span>
                      </div>

                      {!isDineIn && (
                        <p className="text-xs text-red-500 mt-1">
                          Scan a table QR to enable ordering
                        </p>
                      )}

                      <button
                        onClick={onSubmitOrder}
                        disabled={!isDineIn || submittingOrder || displayedStatus !== "none"}
                        className={`mt-3 w-full py-2 rounded-md text-white ${
                          isDineIn ? "bg-[#E23838] hover:bg-red-700" : "bg-gray-400"
                        }`}
                      >
                        {submittingOrder
                          ? "Submitting..."
                          : displayedStatus === "none"
                          ? "Submit Order"
                          : "Order Submitted"}
                      </button>

                      {computedUnpaidOrders.length > 0 && (
                        <button
                          onClick={openPaymentFlow}
                          disabled={processingPayment || !!paymentFeedback}
                          className="mt-3 w-full py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          {processingPayment ? "Opening payment..." : "Pay Bill"}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 text-center">
                        Your cart is empty
                      </p>
                      {computedUnpaidOrders.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-center text-sm font-semibold text-yellow-800">
                          Waiting for payment confirmation...
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}

              {/* STATUS */}
              {activeTab === "status" && (
                <div className="space-y-3">
                  {/* Current Order */}
                  {currentOrder ? (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <p className="font-medium text-[#E23838] text-lg capitalize">
                        Current Order Status: {currentOrder.status.replaceAll("_", " ")}
                      </p>

                      <div className="divide-y mt-2 text-sm">
                        {currentOrder.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2">
                            <span>{item.name}</span>
                            <span>₱{Number(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between font-bold mt-3 pt-2 border-t">
                        <span>Total</span>
                        <span>₱{Number(currentOrder.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">No active orders</p>
                  )}

                  {computedUnpaidOrders.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={openPaymentFlow}
                        disabled={processingPayment || !!paymentFeedback}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition"
                      >
                        {processingPayment ? "Opening payment..." : "Pay Bill"}
                      </button>
                    </div>
                  )}

                  {/* All Session Orders */}
                  {sessionOrders.length > 0 && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium text-blue-800 mb-2">All Session Orders</h4>
                      {sessionOrders.map((order) => (
                        <div key={order.id} className="text-sm mb-3 p-2 bg-white rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Order #{order.id.slice(-6)}</span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                order.status as any,
                                order.is_paid
                              )}`}
                            >
                              {getOrderStatusLabel(order.status as any, order.is_paid)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 capitalize mb-1">
                            Status: {order.status}
                          </div>
                          <div className="flex justify-between">
                            <span>{order.items?.length || 0} items</span>
                            <span className="font-medium">₱{Number(order.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>Session Total</span>
                        <span>₱{sessionTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RECEIPTS */}
              {activeTab === "receipts" && (
                <div className="space-y-3">
                  {/* Served Orders */}
                  {sessionOrders.filter(o => o.status === "served").length > 0 ? (
                    <div className="p-4 border rounded-lg bg-green-50">
                      <h4 className="font-medium text-green-800 mb-3">Completed Orders</h4>
                      {sessionOrders
                        .filter(o => o.status === "served")
                        .map((order) => (
                          <div key={order.id} className="text-sm mb-3 p-3 bg-white rounded border border-green-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-800">Order #{order.id.slice(-6)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(order.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <span className="inline-flex rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                âœ“ Served
                              </span>
                            </div>
                            <div className="border-t border-green-100 pt-2 mt-2 space-y-1">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-700">
                                  <span>{item.name} x{item.quantity || 1}</span>
                                  <span className="font-medium">₱{(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-green-100 pt-2 mt-2 flex justify-between font-bold text-sm">
                              <span>Total</span>
                              <span className="text-green-700">₱{Number(order.total_amount).toFixed(2)}</span>
                            </div>
                            <div className="mt-2 text-xs">
                              <span className={`inline-flex px-2 py-1 rounded ${order.is_paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {order.is_paid ? "âœ“ Paid" : "â° Unpaid"}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No completed orders yet</p>
                      <p className="text-xs mt-2">Served orders will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order More Prompt Modal */}
      {showOrderMoreModal && !orderMoreHandled && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center animate-scaleIn">
            
            {/* Icon */}
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
              <span className="text-green-600 text-2xl">âœ“</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Ready to Order?
            </h3>

            {/* Subtitle */}
            <p className="text-gray-500 text-sm mb-6">
              Would you like to add more items or proceed to payment?
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onCloseOrderMoreModal?.();
                }}
                className="w-full py-3 bg-[#E23838] hover:bg-red-700 text-white rounded-xl font-semibold transition"
              >
                🍽️ Add More Items
              </button>

              <button
                disabled={processingPayment}
                onClick={async () => {
                  if (processingPayment) return;

                  setProcessingPayment(true);
                  onCloseOrderMoreModal?.();
                  setShowPaymentModal(true);

                  try {
                    await onSubmitAndPay?.();
                  } catch (err) {
                    console.error("Submit & Pay failed:", err);
                  } finally {
                    setProcessingPayment(false);
                  }
                }}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition"
              >
                💳 Submit & Pay
              </button>
            </div>

            {/* Optional subtle hint */}
            <p className="text-xs text-gray-400 mt-4">
              You can still add more items before paying
            </p>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="bg-[#E23838] px-6 py-4 text-center">
              <h3 className="text-lg font-bold text-white">
                Complete Payment
              </h3>
            </div>

            <div className="p-6 space-y-5">
              
              {/* ðŸ’° TOTAL DISPLAY (THIS IS THE KEY PART) */}
              <div className="bg-gray-50 border rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Amount
                </p>
                <p className="text-3xl font-bold text-[#E23838] mt-1">
                  ₱{unpaidTotal.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {computedUnpaidOrders.length} unpaid order(s)
                </p>
              </div>

              {paymentFeedback ? (
                <div className="space-y-5">
                  <div className="rounded-3xl bg-blue-50 p-5 text-center text-blue-800 shadow-sm">
                    <p className="font-semibold">{paymentFeedback}</p>
                    <p className="text-sm text-blue-700/80 mt-2">
                      The restaurant will confirm once the payment is received.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-blue-100 bg-white p-4 text-center text-sm text-blue-700">
                    {selectedPaymentMethod === "gcash"
                      ? "Waiting for GCash confirmation..."
                      : "Waiting for cash confirmation..."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 text-center">
                    Choose how you would like to pay. The restaurant will confirm once the payment is received.
                  </div>

                  {/* Payment Options */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodSelect("cash")}
                      disabled={processingPayment || !enabledMethods.cash}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center transition ${enabledMethods.cash ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                    >
                      {processingPayment && selectedPaymentMethod === "cash" ? (
                        "Processing..."
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                          Pay with Cash
                        </>
                      )}
                    </button>

                    {enabledMethods.gcash ? (
                      <button
                        type="button"
                        onClick={() => handlePaymentMethodSelect("gcash")}
                        disabled={processingPayment}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center transition bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {processingPayment && selectedPaymentMethod === "gcash" ? (
                          "Processing..."
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faQrcode} className="mr-2" />
                            Pay with GCash
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                        GCash is not available for this business right now.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {orderCompleteModal && completedOrder && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#E23838] px-6 py-5">
              <h2 className="text-2xl font-bold text-white">Order Complete</h2>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-700 text-lg font-semibold">
                Thank you for ordering!
              </p>
              <p className="text-gray-600">
                Your order is complete and has been completed.
              </p>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm uppercase tracking-wider text-gray-500">
                    Order ID
                  </p>
                  <p className="font-semibold text-gray-800">
                    {completedOrder.id.slice(0, 8)}...
                  </p>
                </div>

                <div className="space-y-2">
                  {completedOrder.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-gray-700"
                    >
                      <span>{item.name}</span>
                      <span className="font-semibold text-[#E23838]">
                        ₱{item.price}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold text-[#E23838]">
                    ₱{completedOrder.total_amount.toFixed(2)}
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
        onClose={() => setShowRatingModal(false)}
        onRated={() => console.log("Thanks for rating!")}
      />
    </>
  );
};

export default OrdersButton;

