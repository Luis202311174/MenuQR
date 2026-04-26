"use client";

import React, { useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  availability?: boolean;
  description?: string;
  menu_desc?: string;
};

type CartItemNoAddons = MenuItem & {
  menu_item_id: string;
  name: string;
  qty: number;
  base_price: number;
};

interface MenuItemNoAddonsModalProps {
  viewItem: MenuItem;
  setViewItem: (item: MenuItem | null) => void;
  onAddToCart: (item: CartItemNoAddons) => void;
}

export default function MenuItemNoAddonsModal({
  viewItem,
  setViewItem,
  onAddToCart,
}: MenuItemNoAddonsModalProps) {
  const [qty, setQty] = useState(1);

  const handleAddToCart = () => {
    onAddToCart({
      ...viewItem,
      menu_item_id: viewItem.id,
      qty,
      base_price: viewItem.price,
    });

    setViewItem(null);
  };

  const totalPrice = (viewItem?.price || 0) * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-3">
      <div className="w-full max-w-lg rounded-[28px] border border-[#E23838]/50 bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#E23838] px-4 py-3 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {viewItem.name}
          </h3>
          <button
            onClick={() => setViewItem(null)}
            className="rounded-lg border border-white px-2 py-1 text-xs font-semibold text-white hover:bg-white hover:text-[#E23838] transition"
          >
            ✖
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Item Image & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <div className="h-40 w-full rounded-2xl border border-gray-300 bg-gray-100 overflow-hidden flex-shrink-0">
              {viewItem.image_url ? (
                <img
                  src={viewItem.image_url}
                  alt={viewItem.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-500">
                  No image
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Description</p>
                <p className="text-sm text-gray-700 leading-6 mt-2">
                  {viewItem.description || viewItem.menu_desc || "No description available."}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 font-semibold uppercase">Base Price</p>
                <p className="text-2xl font-black text-[#E23838]">
                  ₱{viewItem.price}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Category</p>
                <p className="text-sm text-gray-700 font-semibold">
                  {viewItem.category || "Unknown"}
                </p>
              </div>
            </div>
          </div>

          {/* NO CUSTOMIZE SECTION - SIMPLIFIED LAYOUT */}

          {/* Price & Add to Cart */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded-2xl">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-2xl font-black text-[#E23838]">₱{totalPrice}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-center">
              <button
                onClick={() => setViewItem(null)}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 flex items-center justify-between gap-3">
                <span>Qty</span>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-7 h-7 rounded-full bg-white border border-gray-200">-</button>
                  <span className="w-7 text-center">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="w-7 h-7 rounded-full bg-white border border-gray-200">+</button>
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className="rounded-2xl bg-[#E23838] px-4 py-2 text-sm font-bold text-[#F2FF00] transition hover:bg-[#c22f2f]"
              >
                Add ₱{totalPrice.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
