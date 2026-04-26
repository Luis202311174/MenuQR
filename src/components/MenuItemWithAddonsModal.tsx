"use client";

import React, { useState } from "react";
import { CustomerOptionGroup } from "@/utils/customerMenuUtils";

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

interface MenuItemWithAddonsModalProps {
  viewItem: MenuItem;
  setViewItem: (item: MenuItem | null) => void;
  optionGroups: CustomerOptionGroup[];
  selectedOptions: Record<string, string[]>;
  onOptionSelect: (groupId: string, optionId: string, isMultiple: boolean) => void;
  onAddToCart: (item: CartItemWithOptions) => void;
}

export default function MenuItemWithAddonsModal({
  viewItem,
  setViewItem,
  optionGroups,
  selectedOptions,
  onOptionSelect,
  onAddToCart,
}: MenuItemWithAddonsModalProps) {
  const [qty, setQty] = useState(1);

  const calculateAddonsTotal = (): number => {
    let total = 0;

    optionGroups.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optionId) => {
        const option = group.menu_item_options.find((o) => o.id === optionId);
        if (option) {
          total += option.price_modifier;
        }
      });
    });

    return total;
  };

  const validateSelections = (): boolean => {
    for (const group of optionGroups) {
      const selected = selectedOptions[group.id] || [];
      const count = selected.length;

      if (group.is_required && count === 0) {
        alert(`"${group.name}" is required`);
        return false;
      }

      if (count < group.min_select) {
        alert(`Select at least ${group.min_select} option(s) for "${group.name}"`);
        return false;
      }

      if (count > group.max_select) {
        alert(`Select at most ${group.max_select} option(s) for "${group.name}"`);
        return false;
      }
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!validateSelections()) return;

    const addonsTotal = calculateAddonsTotal();

    const formattedOptions = optionGroups.flatMap(group => {
      const selectedIds = selectedOptions[group.id] || [];

      return selectedIds.map(optionId => {
        const opt = group.menu_item_options.find(o => o.id === optionId);
        if (!opt) return null;

        return {
          group_name: group.name,
          option_name: opt.name,
          price_modifier: opt.price_modifier,
        };
      }).filter(
        (opt): opt is {
          group_name: string;
          option_name: string;
          price_modifier: number;
        } => opt !== null
      );
    });

    onAddToCart({
      ...viewItem,
      menu_item_id: viewItem.id,
      qty,
      base_price: viewItem.price,
      selected_options: formattedOptions,
    });

    setViewItem(null);
  };

  const addonsTotal = calculateAddonsTotal();
  const totalPrice = ((viewItem?.price || 0) + addonsTotal) * qty;

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

          {/* Option Groups - WITH ADDONS */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">Customize Your Order</h4>
              <p className="text-xs text-gray-500 mt-1">Tap add-ons to select or deselect them. Multiple selections are allowed where available.</p>
            </div>

            {optionGroups.map((group) => {
              const isMultiple = group.max_select > 1;
              const selectedCount = (selectedOptions[group.id] || []).length;

              return (
                <div key={group.id} className="border border-gray-300 rounded-2xl p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h5 className="font-semibold text-slate-900 text-sm">{group.name}</h5>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {group.is_required ? "Required" : "Optional"}
                        {isMultiple && ` • Select up to ${group.max_select}`}
                      </p>
                    </div>
                    <span className="text-[11px] bg-gray-200 text-gray-700 font-semibold px-2 py-1 rounded-full">
                      {selectedCount}/{group.max_select}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.menu_item_options.map((option) => {
                      const isSelected = (selectedOptions[group.id] || []).includes(option.id);
                      const isDisabled =
                        !option.is_available ||
                        (!isSelected && selectedCount >= group.max_select);

                      return (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 p-3 border rounded-2xl cursor-pointer transition ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-white"
                              : isSelected
                              ? "border-[#E23838] bg-[#FEF5F5]"
                              : "border-gray-300 bg-white hover:border-gray-400"
                          }`}
                        >
                          <input
                            type={isMultiple ? "checkbox" : "radio"}
                            checked={isSelected}
                            onChange={() =>
                              !isDisabled && onOptionSelect(group.id, option.id, isMultiple)
                            }
                            disabled={isDisabled}
                            className="w-4 h-4 rounded accent-[#E23838]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{option.name}</p>
                            {!option.is_available && (
                              <p className="text-[11px] text-red-600 font-semibold">Not Available</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {option.price_modifier > 0
                                ? `+₱${option.price_modifier}`
                                : option.price_modifier < 0
                                ? `₱${option.price_modifier}`
                                : "Free"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price Breakdown & Add to Cart */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            {addonsTotal !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Base Price</span>
                <span className="font-semibold">₱{viewItem.price}</span>
              </div>
            )}

            {addonsTotal !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Addons</span>
                <span className={`font-semibold ${addonsTotal > 0 ? "text-[#E23838]" : "text-green-600"}`}>
                  {addonsTotal > 0 ? `+₱${addonsTotal}` : `₱${addonsTotal}`}
                </span>
              </div>
            )}

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
