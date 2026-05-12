"use client";

import React, { useState } from "react";
import MenuItemModal from "./MenuItemModal";
import { useSingleItemInventory } from "@/hooks/useInventory";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  image_position?: string;
  availability?: boolean;
  description?: string;
  menu_desc?: string;
  is_trackable?: boolean;
  current_stock?: number | null;
  // Nutrition facts
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving_size?: string;
  allergens?: string[];
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
  businessId,
}: {
  items: MenuItem[];
  onAddToCart?: (item: CartItemWithOptions) => void;
  viewItem?: MenuItem | null;
  setViewItem: (item: MenuItem | null) => void;
  isDineIn?: boolean;
  businessId?: string;
}) {
  const handleOpenItem = (item: MenuItem) => {
    setViewItem(item);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 flex-1">
      {items.map((item) => (
        <MenuItemWithInventory
          key={item.id}
          item={item}
          businessId={businessId}
          onOpenItem={handleOpenItem}
          isDineIn={isDineIn}
        />
      ))}

      {viewItem && (
        <MenuItemModal
          viewItem={viewItem}
          setViewItem={setViewItem}
          onAddToCart={onAddToCart}
          businessId={businessId}
        />
      )}
    </div>
  );
}

// Separate component for each menu item with its own inventory hook
function MenuItemWithInventory({
  item,
  businessId,
  onOpenItem,
  isDineIn,
}: {
  item: MenuItem;
  businessId?: string;
  onOpenItem: (item: MenuItem) => void;
  isDineIn?: boolean;
}) {
  const { stock, loading } = useSingleItemInventory(businessId, item.id, item.is_trackable);
  
  // Use real-time stock data if available, otherwise fall back to item data
  const currentStock = stock ?? item.current_stock ?? 0;
  const isTrackable = item.is_trackable ?? false;
  const availability = item.availability ?? true;
  
  const isOutOfStock = isTrackable && currentStock <= 0;
  const isAvailable = availability && !isOutOfStock;

  return (
    <div className="border border-gray-200 rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white transform hover:-translate-y-0.5">
      <div className="h-28 w-full bg-gray-100 overflow-hidden sm:h-32">
        {item.image_url ? (
          <img
            src={item.image_url}
            className="w-full h-full object-cover"
            style={{ objectPosition: item.image_position || "center" }}
          />
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
          <div>
            <p className="text-base sm:text-xl font-black text-blue-600">₱{item.price}</p>
            {item.calories != null && (
              <p className="text-[11px] text-gray-500 mt-1">
                ~{item.calories} cal
              </p>
            )}
            {isTrackable && (
              <p className="text-[11px] text-gray-500 mt-1">
                Stock: {loading ? "..." : currentStock}
              </p>
            )}
          </div>
          <span
            className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full ${
              isAvailable
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isAvailable ? "Available" : "Sold out"}
          </span>
        </div>

        <div className="flex gap-2">
          {isDineIn ? (
            <>
              <button
                onClick={() => onOpenItem(item)}
                disabled={!isAvailable}
                className={`flex-1 rounded-2xl px-2 py-2 text-[10px] sm:text-sm font-semibold text-white transition ${
                  isAvailable
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                View
              </button>
              <button
                onClick={() => onOpenItem(item)}
                disabled={!isAvailable}
                className={`flex-1 rounded-2xl px-2 py-2 text-[10px] sm:text-sm font-semibold text-blue-600 border border-blue-600 bg-white transition ${
                  isAvailable
                    ? "hover:bg-blue-50"
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
  );
}

