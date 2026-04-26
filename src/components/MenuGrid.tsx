"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchMenuItemWithOptions, CustomerOptionGroup, CustomerOption } from "@/utils/customerMenuUtils";
import MenuItemWithAddonsModal from "./MenuItemWithAddonsModal";
import MenuItemNoAddonsModal from "./MenuItemNoAddonsModal";

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
}

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
  const [optionGroups, setOptionGroups] = useState<CustomerOptionGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  
  useEffect(() => {
    if (!viewItem) {
      setOptionGroups([]);
      setSelectedOptions({});
      setQty(1);
    }
  }, [viewItem]);

  const handleOpenItem = async (item: MenuItem) => {
    try {
      const groups = await fetchMenuItemWithOptions(item.id);
      setOptionGroups(groups);

      const initialSelection: Record<string, string[]> = {};
      groups.forEach((group) => {
        initialSelection[group.id] = [];
      });

      setSelectedOptions(initialSelection);
      setQty(1);
      setViewItem(item);
    } catch (error) {
      console.error("Failed to load option groups:", error);
    }
  };

  const handleOptionSelect = (groupId: string, optionId: string, isMultiple: boolean) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];

      if (isMultiple) {
        // For multiple select (checkbox)
        if (current.includes(optionId)) {
          return {
            ...prev,
            [groupId]: current.filter((id) => id !== optionId),
          };
        } else {
          return {
            ...prev,
            [groupId]: [...current, optionId],
          };
        }
      } else {
        // For single select (radio)
        return {
          ...prev,
          [groupId]: current[0] === optionId ? [] : [optionId],
        };
      }
    });
  };

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

  // Check if item has add-ons
  const hasAddons = optionGroups.length > 0;

  const handleAddToCart = () => {
    if (!validateSelections()) return;
    if (!viewItem || !onAddToCart) return;

    const addonsTotal = calculateAddonsTotal();

    // ✅ FORMAT OPTIONS HERE
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

    // ✅ SEND CORRECT STRUCTURE
    onAddToCart({
      ...viewItem,
      menu_item_id: viewItem.id,
      qty,
      base_price: viewItem.price,
      selected_options: formattedOptions,
    });

    setViewItem(null);
  };

  const handleAddToCartNoAddons = () => {
    if (!viewItem || !onAddToCart) return;

    onAddToCart({
      ...viewItem,
      menu_item_id: viewItem.id,
      qty,
      base_price: viewItem.price,
      selected_options: [],
    } as any);

    setViewItem(null);
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

      {/* Conditional Modal - With or Without Add-ons */}
      {viewItem && setViewItem && hasAddons && (
        <MenuItemWithAddonsModal
          viewItem={viewItem}
          setViewItem={setViewItem}
          optionGroups={optionGroups}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
          onAddToCart={handleAddToCart}
        />
      )}

      {viewItem && setViewItem && !hasAddons && (
        <MenuItemNoAddonsModal
          viewItem={viewItem}
          setViewItem={setViewItem}
          onAddToCart={handleAddToCartNoAddons}
        />
      )}
    </div>
  );
}

