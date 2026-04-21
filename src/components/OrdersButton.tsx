import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faShoppingCart, faReceipt, faCreditCard, faQrcode, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import { OrderData } from "@/utils/fetchActiveOrder";
import { getOrderStatusLabel, getStatusColor } from "@/utils/orderStatusManager";
import { processSessionPayment } from "@/utils/paymentManager";
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
  sessionId?: string;
  businessId?: string;
  tableId?: string;
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
  tableId,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "status" | "receipts">("cart");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gcash" | "cash" | null>(null);
  const [showOrderAgainModal, setShowOrderAgainModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Calculate totals for unpaid orders
  const unpaidTotal = unpaidOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const sessionTotal = sessionOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

  // Check if there are any served orders
  const servedOrders = sessionOrders.filter((order) => order.status === "served");
  const shouldShowOrderAgainPrompt =
    servedOrders.length > 0 && cartItems.length === 0 && unpaidOrders.length === 0;

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

      // Process payment through payment manager
      await processSessionPayment(sessionId, method);

      setPaymentSuccess(true);
      setShowPaymentModal(false);
      setSelectedPaymentMethod(null);

      // Call parent callback if provided
      if (onPayBill) {
        onPayBill();
      }

      // Show success message
      setTimeout(() => {
        alert("Payment processed successfully!");
        setPaymentSuccess(false);
      }, 500);
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
                    <div className="space-y-3">
                      <p className="text-gray-500 text-center">Cart is empty</p>

                      {/* Session Orders Summary */}
                      {unpaidOrders.length > 0 && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <h4 className="font-medium text-[#E23838] mb-2">Current Session Orders</h4>
                          {unpaidOrders.map((order) => (
                            <div key={order.id} className="text-sm mb-2">
                              <div className="flex justify-between">
                                <span>Order #{order.id.slice(-6)}</span>
                                <span>₱{Number(order.total_amount).toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                Status: {order.status}
                              </div>
                            </div>
                          ))}
                          <hr className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>Unpaid Total</span>
                            <span>₱{unpaidTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Pay the Bill Button */}
                      {unpaidOrders.length > 0 && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
                        >
                          <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                          Pay the Bill (₱{unpaidTotal.toFixed(2)})
                        </button>
                      )}
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
        <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-center mb-4">Order Submitted!</h3>
            <p className="text-center text-gray-600 mb-6">Would you like to order more items?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleOrderMore(true)}
                className="flex-1 py-2 bg-[#E23838] hover:bg-red-700 text-white rounded-md font-medium"
              >
                Order More
              </button>
              <button
                onClick={() => handleOrderMore(false)}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium"
              >
                Pay Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-center mb-4">Choose Payment Method</h3>
            <p className="text-center text-gray-600 mb-6">
              Total to pay: ₱{unpaidTotal.toFixed(2)}
            </p>
            {paymentSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded text-center">
                ✓ Payment processed successfully!
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={() => handlePaymentMethodSelect("gcash")}
                disabled={processingPayment || paymentSuccess}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium flex items-center justify-center"
              >
                {processingPayment ? (
                  <>
                    <span className="mr-2">Processing...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faQrcode} className="mr-2" />
                    GCash QR Code
                  </>
                )}
              </button>
              <button
                onClick={() => handlePaymentMethodSelect("cash")}
                disabled={processingPayment || paymentSuccess}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md font-medium flex items-center justify-center"
              >
                {processingPayment ? (
                  <>
                    <span className="mr-2">Processing...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                    Cash
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentSuccess(false);
              }}
              className="mt-3 w-full py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md"
            >
              Close
            </button>
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
    </>
  );
};

export default OrdersButton;