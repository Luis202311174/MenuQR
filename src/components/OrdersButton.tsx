import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faShoppingCart, faReceipt, faCreditCard, faQrcode, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import { OrderData } from "@/utils/fetchActiveOrder";
import { getOrderStatusLabel, getStatusColor } from "@/utils/orderStatusManager";
import { storeSessionReceipt } from "@/utils/receiptManager";

interface CartItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

type OrderItem = {
  id: string;
  name: string;
  category?: string;
  price: number;
};

interface OrdersButtonProps {
  cartItems: CartItem[];
  cartTotal: number;
  orderStatus: string; // initial fallback for "none"
  isDineIn: boolean;
  submittingOrder: boolean;
  onSubmitOrder: () => void;
  onRemoveItem: (index: number) => void;
  currentOrder?: OrderData | null;
  sessionOrders?: OrderData[]; // New: All orders in the session
  unpaidOrders?: OrderData[]; // New: Unpaid orders in the session
  onPayBill?: () => void; // New: Pay the bill handler
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
  badgeCount,
  sessionId,
  businessId,
  orderCompleteModal,
  completedOrder,
  onCloseOrderCompleteModal,
  tableId,
  paymentSettings, // 🔥 ADD THIS
  onPaymentComplete, // 🔥 ADD THIS
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "status" | "receipts">("cart");
  const [showOrderAgainModal, setShowOrderAgainModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gcash" | "cash" | null>(null);

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

  const computedUnpaidOrders = useMemo(() => {
    return sessionOrders.filter(
      (order) =>
        !order.is_paid &&
        ["served", "completed"].includes(order.status)
    );
  }, [sessionOrders]);

  const unpaidTotal = useMemo(() => {
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
    return currentOrder ? currentOrder.status : orderStatus;
  }, [currentOrder, orderStatus]);

  const handleOrderMore = (wantsMore: boolean) => {
    if (wantsMore) {
      if (onCloseOrderMoreModal) {
        onCloseOrderMoreModal();
      }
    } else {
      if (onCloseOrderMoreModal) {
        onCloseOrderMoreModal();
      }
      setShowPaymentModal(true);
    }
  };

  const handlePaymentMethodSelect = async (method: "gcash" | "cash") => {
    if (!sessionId || !businessId) {
      alert("Session information missing");
      return;
    }

    setProcessingPayment(true);

    try {
      setSelectedPaymentMethod(method);

      if (onPaymentComplete) {
        await onPaymentComplete(method);
      }

      // ✅ SHOW SUCCESS FIRST
      setPaymentSuccess(true);

      setTimeout(() => {
        setPaymentSuccess(false);
        setShowPaymentModal(false);

        if (onPayBill) {
          onPayBill(); // ✅ runs AFTER delay
        }
      }, 3500);

      if (onPayBill) {
        onPayBill();
      }

    } catch (error) {
      console.error("Payment processing error:", error);
      alert("Payment processing failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleOrderAgainDecision = async (continueOrdering: boolean) => {
    if (continueOrdering) {
      // User wants to order again - session continues
      setShowOrderAgainModal(false);
      // Cart will be cleared automatically, ready for new items
    } else {
      // User wants to finish - proceed to payment
      if (sessionId && businessId) {
        try {
          await storeSessionReceipt(sessionId, businessId);
        } catch (error) {
          console.warn("Failed to store receipt:", error);
        }
      }
      setShowOrderAgainModal(false);
      setShowPaymentModal(true);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[999] w-16 h-16 rounded-full bg-[#E23838] text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition"
      >
        <FontAwesomeIcon icon={faClipboardList} size="2x" />
        {badgeCount && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
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
                      {cartItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-gray-500">{item.category || "Food"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p>₱{Number(item.price).toFixed(2)}</p>
                            <button
                              onClick={() => onRemoveItem(index)}
                              className="text-red-500 font-bold"
                            >
                              ✕
                            </button>
                          </div>
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
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">
                      Your cart is empty
                    </p>
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
                                ✓ Served
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
                                {order.is_paid ? "✓ Paid" : "⏰ Unpaid"}
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
      {showOrderMoreModal && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center animate-scaleIn">
            
            {/* Icon */}
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
              <span className="text-green-600 text-2xl">✓</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Order Submitted!
            </h3>

            {/* Subtitle */}
            <p className="text-gray-500 text-sm mb-6">
              Your order is being prepared.  
              Want to add more items or proceed to payment?
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => handleOrderMore(true)}
                className="w-full py-3 bg-[#E23838] hover:bg-red-700 text-white rounded-xl font-semibold transition"
              >
                🍽️ Add More Items
              </button>

              <button
                onClick={openPaymentFlow}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition"
              >
                💳 Pay Bill
              </button>
            </div>

            {/* Optional subtle hint */}
            <p className="text-xs text-gray-400 mt-4">
              You can still order again after this
            </p>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="bg-[#E23838] px-6 py-4 text-center">
              <h3 className="text-lg font-bold text-white">
                Complete Payment
              </h3>
            </div>

            <div className="p-6 space-y-5">
              
              {/* 💰 TOTAL DISPLAY (THIS IS THE KEY PART) */}
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

              {paymentSuccess && (
                <div className="p-4 bg-green-100 text-green-800 rounded-xl text-center text-sm font-medium animate-pulse">
                  ✓ Payment successful! Closing...
                </div>
              )}

              {/* Payment Options */}
              <div className="space-y-3">
                
                {enabledMethods.gcash && (
                  <button
                    onClick={() => handlePaymentMethodSelect("gcash")}
                    disabled={processingPayment || paymentSuccess}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold flex items-center justify-center transition"
                  >
                    {processingPayment ? (
                      "Processing..."
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faQrcode} className="mr-2" />
                        Pay with GCash
                      </>
                    )}
                  </button>
                )}

                {enabledMethods.cash && (
                  <button
                    onClick={() => handlePaymentMethodSelect("cash")}
                    disabled={processingPayment || paymentSuccess}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold flex items-center justify-center transition"
                  >
                    {processingPayment ? (
                      "Processing..."
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                        Pay with Cash
                      </>
                    )}
                  </button>
                )}

              </div>

              {/* Footer */}
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentSuccess(false);
                  setSelectedPaymentMethod(null);
                }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Again Modal - shown when order is served */}
      {shouldShowOrderAgainPrompt && (
        <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-center mb-2 text-green-600">✓ Order Served!</h3>
            <p className="text-center text-gray-600 mb-6">Your order has been served.</p>
            <p className="text-center text-gray-500 mb-6 text-sm">Would you like to order more items?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleOrderAgainDecision(true)}
                className="flex-1 py-3 bg-[#E23838] hover:bg-red-700 text-white rounded-md font-medium"
              >
                Order Again
              </button>
              <button
                onClick={() => handleOrderAgainDecision(false)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
              >
                Pay Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {orderCompleteModal && completedOrder && (
        <div className="fixed inset-0 z-[1200] bg-black/50 flex items-center justify-center p-4">
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
    </>
  );
};

export default OrdersButton;