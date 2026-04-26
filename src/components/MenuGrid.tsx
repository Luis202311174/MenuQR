"use client";

import React, { useState } from "react";
import MenuItemModal from "./MenuItemModal";

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

type CartItemWithOptions = MenuItem & {
  menu_item_id: string;
  name: string;
  qty: number;
  base_price: number;
  selected_options: {
    group_name: string;
    option_name: string;
    price_modifier: number;
  }[];
};

export default function MenuGrid({
  items,
  onAddToCart,
  viewItem,
  setViewItem,
  isDineIn,
}: {
  items: MenuItem[];
  onAddToCart?: (item: CartItemWithOptions) => void;
  viewItem?: MenuItem | null;
  setViewItem: (item: MenuItem | null) => void;
  isDineIn?: boolean;
}) {
  const handleOpenItem = (item: MenuItem) => {
    setViewItem(item);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 flex-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-gray-200 rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white transform hover:-translate-y-0.5"
        >
          <div className="h-28 w-full bg-gray-100 overflow-hidden sm:h-32">
            {item.image_url ? (
              <img src={item.image_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                No image available
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 flex flex-col gap-3">
            <div>
              <h3 className="font-black text-xs sm:text-sm leading-snug text-gray-900">
                {item.name}
              </h3>
              <p className="mt-1 text-[10px] sm:text-xs text-red-600 uppercase tracking-[0.24em] font-semibold">
                {item.category || "Menu"}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <p className="text-base sm:text-xl font-black text-[#E23838]">₱{item.price}</p>
              <span
                className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full ${
                  item.availability
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {item.availability ? "Available" : "Sold out"}
              </span>
            </div>

            <div className="flex gap-2">
              {isDineIn ? (
                <>
                  <button
                    onClick={() => handleOpenItem(item)}
                    disabled={!item.availability}
                    className={`flex-1 rounded-2xl px-2 py-2 text-[10px] sm:text-sm font-semibold text-white transition ${
                      item.availability
                        ? "bg-[#E23838] hover:bg-[#c22f2f]"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleOpenItem(item)}
                    disabled={!item.availability}
                    className={`flex-1 rounded-2xl px-2 py-2 text-[10px] sm:text-sm font-semibold text-[#E23838] border border-[#E23838] bg-white transition ${
                      item.availability
                        ? "hover:bg-[#FFEAEA]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                    }`}
                  >
                    Add
                  </button>
                </>
              ) : (
                <div className="flex-1 rounded-2xl bg-gray-100 border border-gray-200 px-2 py-2 text-[10px] sm:text-xs font-semibold text-gray-700 text-center flex items-center justify-center">
                  Scan QR to order
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {viewItem && (
        <MenuItemModal
          viewItem={viewItem}
          setViewItem={setViewItem}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
}

