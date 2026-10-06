"use client";

import React, { useState } from "react";
import MenuItemModal from "./MenuItemModal";
import { useSingleItemInventory } from "@/hooks/useInventory";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  category?: string;
  image_url?: string;
  image_position?: string;
  prep_time?: number | string | null;
  rating?: number | null;
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
    <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
    <article className="min-w-0 overflow-hidden rounded-2xl bg-white sm:rounded-3xl">
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 sm:rounded-3xl">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={{ objectPosition: item.image_position || "center" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] text-slate-400 sm:text-xs">
            No image
          </div>
        )}

        {item.prep_time != null && item.prep_time !== "" && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-3.5rem)] truncate rounded-md bg-black/65 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-sm sm:bottom-3 sm:left-3 sm:text-xs">
            {typeof item.prep_time === "number" ? `${item.prep_time} min` : item.prep_time}
          </span>
        )}

        {isDineIn && (
          <button
            type="button"
            onClick={() => onOpenItem(item)}
            disabled={!isAvailable}
            aria-label={`Add ${item.name}`}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1.5 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:bottom-3 sm:right-3 sm:gap-2 sm:px-3 sm:py-2"
          >
            <span aria-hidden="true" className="text-base font-medium leading-none sm:text-xl">+</span>
            <span className="text-[9px] font-semibold leading-none sm:text-xs">Add to order</span>
          </button>
        )}

        {!isAvailable && (
          <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[9px] font-semibold text-white sm:left-3 sm:top-3 sm:text-xs">
            Sold out
          </span>
        )}
      </div>

      <div className="min-w-0 pt-2 sm:pt-3">
        <h3 className="line-clamp-1 text-[11px] font-semibold leading-snug text-slate-900 sm:text-sm">
          {item.name}
        </h3>

        <div className="mt-1 flex min-w-0 items-center justify-between gap-1">
          <p className="min-w-0 truncate text-[9px] text-slate-500 sm:text-xs">
            {item.category || "Menu"}
            {item.rating != null && Number.isFinite(Number(item.rating)) && (
              <span className="ml-1 inline-flex items-center gap-0.5 whitespace-nowrap text-amber-600">
                <span aria-hidden="true">★</span>
                {Number(item.rating).toFixed(1)}
              </span>
            )}
          </p>
          {isTrackable && (
            <span className="shrink-0 text-[9px] text-slate-500 sm:text-[11px]">
              {loading ? "…" : `${currentStock} left`}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-xs font-bold text-slate-900 sm:text-base">
            ₱{item.price}
          </span>
          {item.original_price != null &&
            Number(item.original_price) > Number(item.price) && (
              <span className="text-[9px] text-slate-400 line-through sm:text-xs">
                ₱{item.original_price}
              </span>
            )}
        </div>
      </div>
    </article>
  );
}
