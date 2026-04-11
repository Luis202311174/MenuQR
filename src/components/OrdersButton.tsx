"use client";

import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faShoppingCart, faReceipt } from "@fortawesome/free-solid-svg-icons";

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

type OrderData = {
  id: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  table_id?: string | null;
  created_at: string;
  updated_at?: string;
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
  badgeCount?: number;
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
  badgeCount,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "status">("cart");

  // 🔹 derive displayedStatus from currentOrder
  const displayedStatus = useMemo(() => {
    return currentOrder ? currentOrder.status : orderStatus;
  }, [currentOrder, orderStatus]);

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
                    <p className="text-gray-500 text-center">Cart is empty</p>
                  )}
                </>
              )}

              {/* STATUS */}
              {activeTab === "status" && (
                <div className="space-y-3">
                  {!currentOrder ? (
                    <p className="text-sm text-gray-500 text-center">No active orders</p>
                  ) : (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <p className="font-medium text-[#E23838] text-lg capitalize">
                        Status: {currentOrder.status.replaceAll("_", " ")}
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersButton;