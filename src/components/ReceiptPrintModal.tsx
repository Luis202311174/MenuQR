"use client";

import React, { useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faTimes } from "@fortawesome/free-solid-svg-icons";
import { generateReceiptPDF, ReceiptData } from "@/utils/generateReceiptPDF";

interface Props {
  isOpen: boolean;
  order: any;
  businessName: string;
  businessAddress?: string;
  onClose: () => void;
}

export default function ReceiptPrintModal({
  isOpen,
  order,
  businessName,
  businessAddress,
  onClose,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrintPDF = () => {
    // Calculate subtotal (without tax)
    const subtotal = order.items.reduce((sum: number, item: any) => {
      const itemAddonsTotal =
        item.selected_options?.reduce(
          (sum: number, opt: any) => sum + (opt.price_modifier || 0),
          0
        ) || 0;
      const itemBasePrice = item.base_price || item.price || 0;
      const itemFinalPrice = itemBasePrice + itemAddonsTotal;
      const itemQty = item.quantity || item.qty || 1;
      return sum + itemFinalPrice * itemQty;
    }, 0);

    // Calculate tax (12% default VAT for Philippines)
    const taxRate = 0.12;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const discount = order.discount_amount || 0;
    const total = subtotal + tax - discount;

    const receiptData: ReceiptData = {
      businessName,
      businessAddress,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      tableNumber: order.table?.table_number || "N/A",
      dateTime: new Date(order.created_at),
      items: order.items.map((item: any) => {
        const itemAddonsTotal =
          item.selected_options?.reduce(
            (sum: number, opt: any) => sum + (opt.price_modifier || 0),
            0
          ) || 0;
        const itemBasePrice = item.base_price || item.price || 0;
        const itemFinalPrice = itemBasePrice + itemAddonsTotal;
        const itemQty = item.quantity || item.qty || 1;
        return {
          name: item.name,
          quantity: itemQty,
          price: itemBasePrice,
          total: itemFinalPrice * itemQty,
          selectedOptions: item.selected_options?.map((opt: any) => ({
            groupName: opt.group_name,
            optionName: opt.option_name,
            priceModifier: opt.price_modifier || 0,
          })),
        };
      }),
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: order.payment_method,
      isPaid: order.is_paid,
    };

    generateReceiptPDF(receiptData);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  // Calculate totals for display
  const subtotal = order.items.reduce((sum: number, item: any) => {
    const itemAddonsTotal =
      item.selected_options?.reduce(
        (sum: number, opt: any) => sum + (opt.price_modifier || 0),
        0
      ) || 0;
    const itemBasePrice = item.base_price || item.price || 0;
    const itemFinalPrice = itemBasePrice + itemAddonsTotal;
    const itemQty = item.quantity || item.qty || 1;
    return sum + itemFinalPrice * itemQty;
  }, 0);

  const taxRate = 0.12;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const discount = order.discount_amount || 0;
  const total = subtotal + tax - discount;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] w-full max-w-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Receipt Preview</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <FontAwesomeIcon icon={faTimes} className="text-slate-600" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Receipt Preview - Thermal Printer Format */}
            <div
              ref={receiptRef}
              className="mx-auto bg-white p-4 shadow-sm border border-slate-300"
              style={{ width: "80mm", fontFamily: "monospace" }}
            >
              {/* Business Name */}
              <div className="text-center mb-3 font-bold text-sm">
                {businessName}
              </div>

              {/* Business Address */}
              {businessAddress && (
                <div className="text-center text-xs mb-3 leading-tight">
                  {businessAddress}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Order Info */}
              <div className="text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span>Order:</span>
                  <span className="font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-bold">{order.table?.table_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Items Header */}
              <div className="text-xs font-bold mb-2 flex justify-between">
                <span>Item</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              <div className="border-t border-dashed border-slate-400 mb-2" />

              {/* Items */}
              <div className="text-xs space-y-3 mb-3">
                {order.items.map((item: any, idx: number) => {
                  const itemAddonsTotal =
                    item.selected_options?.reduce(
                      (sum: number, opt: any) => sum + (opt.price_modifier || 0),
                      0
                    ) || 0;
                  const itemBasePrice = item.base_price || item.price || 0;
                  const itemFinalPrice = itemBasePrice + itemAddonsTotal;
                  const itemQty = item.quantity || item.qty || 1;
                  const itemTotal = itemFinalPrice * itemQty;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="flex-1">{item.name}</span>
                        <span className="w-8 text-center">x{itemQty}</span>
                        <span className="w-16 text-right">P {itemTotal.toFixed(2)}</span>
                      </div>

                      {/* Options */}
                      {item.selected_options &&
                        item.selected_options.length > 0 && (
                          <div className="pl-2 text-[10px] text-slate-600 space-y-0.5">
                            {item.selected_options.map(
                              (opt: any, optIdx: number) => (
                                <div key={optIdx} className="flex justify-between">
                                  <span className="flex-1">
                                    {opt.group_name}: {opt.option_name}
                                  </span>
                                  {opt.price_modifier > 0 && (
                                    <span className="w-16 text-right">
                                      +P {opt.price_modifier.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Totals */}
              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>P {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (12%):</span>
                  <span>P {tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span>Senior/PWD Discount:</span>
                    <span>-P {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-400 pt-1">
                  <span>TOTAL:</span>
                  <span>P {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="text-xs text-center mb-3">
                <span className="font-bold">
                  {order.is_paid ? "PAID" : "UNPAID"}
                </span>
                {order.payment_method && (
                  <span> - {order.payment_method.toUpperCase()}</span>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Footer */}
              <div className="text-center text-xs">
                <div className="mb-1">Thank You!</div>
                <div>Please come again</div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <FontAwesomeIcon icon={faPrint} className="text-sm" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [ref="receiptRef"],
          [ref="receiptRef"] * {
            visibility: visible;
          }
          [ref="receiptRef"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </>
  );
}
