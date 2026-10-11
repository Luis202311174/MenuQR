"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BusinessMenuCardItem } from "@/components/business/BusinessMenuCard";
import { resetInventoryForBusiness } from "@/utils/businessCRUDMenu";

interface BusinessInventoryModalProps {
  isOpen: boolean;
  businessId: string | null;
  menuItems: BusinessMenuCardItem[];
  onClose: () => void;
  onRefetch: () => Promise<void>;
  isOwner?: boolean;
  canManageInventory?: boolean;
}

type EditableInventoryItem = {
  stock: string;
  dailyLimit: string;
  isTrackable: boolean;
};

type CategoryBulkAction = "dailyLimit" | "restock";

function getCategory(item: BusinessMenuCardItem) {
  return item.category?.trim() || "No category";
}

export default function BusinessInventoryModal({
  isOpen,
  businessId,
  menuItems,
  onClose,
  onRefetch,
  isOwner = false,
  canManageInventory = false,
}: BusinessInventoryModalProps) {
  const [inventorySearchFilter, setInventorySearchFilter] = useState("");
  const [inventoryItems, setInventoryItems] = useState<Record<string, EditableInventoryItem>>({});
  const [categoryDailyLimits, setCategoryDailyLimits] = useState<Record<string, string>>({});
  const [categoryRestockStocks, setCategoryRestockStocks] = useState<Record<string, string>>({});
  const [categoryBulkActions, setCategoryBulkActions] = useState<Record<string, CategoryBulkAction>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [inventoryLoading, setInventoryLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !businessId) return;

    const initialInventory: Record<string, EditableInventoryItem> = {};
    const limitsByCategory = new Map<string, Set<string>>();

    menuItems.forEach((item) => {
      const dailyLimit = String(item.daily_limit ?? 0);
      initialInventory[item.id] = {
        stock: String(item.current_stock ?? item.daily_limit ?? 0),
        dailyLimit,
        isTrackable: item.is_trackable ?? false,
      };
      const category = getCategory(item);
      const limits = limitsByCategory.get(category) ?? new Set<string>();
      limits.add(dailyLimit);
      limitsByCategory.set(category, limits);
    });

    setInventoryItems(initialInventory);
    setCategoryDailyLimits(Object.fromEntries(
      [...limitsByCategory].map(([category, limits]) => [
        category,
        limits.size === 1 ? [...limits][0] : "",
      ]),
    ));
    setCategoryRestockStocks({});
    setCategoryBulkActions(Object.fromEntries([...limitsByCategory.keys()].map((category) => [category, "dailyLimit"])));
    setInventorySearchFilter("");
    setExpandedCategories(new Set());
  }, [isOpen, businessId, menuItems]);

  const handleInventoryChange = (itemId: string, field: "stock" | "dailyLimit", value: string) => {
    setInventoryItems((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        [field]: value,
      },
    }));
  };

  const handleCategoryDailyLimitChange = (category: string, value: string) => {
    setCategoryDailyLimits((current) => ({ ...current, [category]: value }));
    const categoryItemIds = menuItems
      .filter((item) => getCategory(item) === category)
      .map((item) => item.id);

    setInventoryItems((current) => {
      const next = { ...current };
      categoryItemIds.forEach((itemId) => {
        if (next[itemId]) next[itemId] = { ...next[itemId], dailyLimit: value };
      });
      return next;
    });
  };

  const handleCategoryRestockChange = (category: string, value: string) => {
    setCategoryRestockStocks((current) => ({ ...current, [category]: value }));
    const trackedItemIds = menuItems
      .filter((item) => getCategory(item) === category && item.is_trackable)
      .map((item) => item.id);

    setInventoryItems((current) => {
      const next = { ...current };
      trackedItemIds.forEach((itemId) => {
        if (next[itemId]) next[itemId] = { ...next[itemId], stock: value };
      });
      return next;
    });
  };

  const handleToggleTrackable = (itemId: string) => {
    setInventoryItems((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        isTrackable: !current[itemId]?.isTrackable,
      },
    }));
  };

  const handleSaveInventory = async () => {
    if (!isOwner && !canManageInventory) {
      alert("Access Denied: You do not have permission to make modifications to the inventory.");
      return;
    }

    if (!businessId) return;

    setInventoryLoading(true);
    try {
      const results = await Promise.all(Object.entries(inventoryItems).map(([itemId, data]) => {
        const stock = Math.max(0, Number.parseInt(data.stock, 10) || 0);
        const dailyLimit = Math.max(0, Number.parseInt(data.dailyLimit, 10) || 0);

        return supabase
          .from("menu_items")
          .update({
            daily_limit: dailyLimit,
            current_stock: data.isTrackable ? stock : null,
            is_trackable: data.isTrackable,
          })
          .eq("id", itemId);
      }));
      const failedUpdate = results.find((result) => result.error);
      if (failedUpdate?.error) throw failedUpdate.error;

      await onRefetch();
      onClose();
    } catch (error) {
      console.error("Failed to save inventory:", error);
      alert(error instanceof Error ? error.message : "Failed to save inventory changes.");
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleInventorySameAsYesterday = async () => {
    if (!isOwner && !canManageInventory) {
      alert("Access Denied: You do not have permission to modify inventory.");
      return;
    }

    if (!businessId) return;

    setInventoryLoading(true);
    try {
      await resetInventoryForBusiness(businessId);
      await onRefetch();
    } catch (error) {
      console.error("Failed to reset inventory:", error);
      alert(error instanceof Error ? error.message : "Failed to reset inventory.");
    } finally {
      setInventoryLoading(false);
    }
  };

  if (!isOpen) return null;

  const query = inventorySearchFilter.trim().toLocaleLowerCase();
  const filteredItems = menuItems.filter((item) =>
    !query ||
    item.name.toLocaleLowerCase().includes(query) ||
    getCategory(item).toLocaleLowerCase().includes(query)
  );
  const groupedItems = filteredItems.reduce<Record<string, BusinessMenuCardItem[]>>((groups, item) => {
    const category = getCategory(item);
    (groups[category] ??= []).push(item);
    return groups;
  }, {});
  const categories = Object.entries(groupedItems).sort(([first], [second]) => first.localeCompare(second));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] max-h-[850px] min-h-[360px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-sm">
              Inventory Management
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Manage Stock Levels
            </h2>
            <p className="mt-1 text-xs text-gray-600 sm:text-sm">
              Set stock and daily limits by item or apply one daily limit to a whole category.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inventory management"
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full text-xs font-semibold text-gray-700 sm:max-w-md sm:text-sm">
              Search items
              <input
                type="search"
                value={inventorySearchFilter}
                onChange={(event) => setInventorySearchFilter(event.target.value)}
                placeholder="Search by item or category..."
                className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none transition focus:border-blue-600 focus:bg-white sm:rounded-2xl sm:px-4 sm:py-3"
              />
            </label>
            <button
              type="button"
              onClick={handleInventorySameAsYesterday}
              disabled={inventoryLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:py-3 sm:text-sm"
            >
              {inventoryLoading ? "Resetting..." : "Same as Yesterday"}
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                {query ? "No items match your search." : "No menu items found."}
              </div>
            ) : categories.map(([category, items]) => {
              const isExpanded = expandedCategories.has(category);
              const bulkAction = categoryBulkActions[category] ?? "dailyLimit";
              const trackedItemCount = menuItems.filter((item) =>
                getCategory(item) === category && item.is_trackable
              ).length;
              return (
                <section key={category} className="overflow-hidden rounded-xl border border-gray-200 sm:rounded-2xl">
                  <div className="flex flex-col gap-3 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedCategories((current) => {
                        const next = new Set(current);
                        if (next.has(category)) next.delete(category);
                        else next.add(category);
                        return next;
                      })}
                      className="flex min-w-0 items-center justify-between gap-3 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900 sm:text-base">{category}</span>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-gray-500 shadow-sm sm:text-xs">
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </span>
                      <svg className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-0.5 sm:self-auto" role="group" aria-label={`${category} bulk inventory action`}>
                        <button
                          type="button"
                          aria-pressed={bulkAction === "dailyLimit"}
                          onClick={() => setCategoryBulkActions((current) => ({ ...current, [category]: "dailyLimit" }))}
                          className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition sm:text-xs ${
                            bulkAction === "dailyLimit" ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          Daily limit
                        </button>
                        <button
                          type="button"
                          aria-pressed={bulkAction === "restock"}
                          onClick={() => setCategoryBulkActions((current) => ({ ...current, [category]: "restock" }))}
                          className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition sm:text-xs ${
                            bulkAction === "restock" ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          Restock
                        </button>
                      </div>
                      <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-600 sm:justify-end">
                        <span className="whitespace-nowrap">
                          {bulkAction === "dailyLimit" ? "Set limit for category" : `Set stock (${trackedItemCount} tracked)`}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={bulkAction === "dailyLimit"
                            ? categoryDailyLimits[category] ?? ""
                            : categoryRestockStocks[category] ?? ""}
                          onChange={(event) => {
                            if (bulkAction === "dailyLimit") {
                              handleCategoryDailyLimitChange(category, event.target.value);
                            } else {
                              handleCategoryRestockChange(category, event.target.value);
                            }
                          }}
                          disabled={(!isOwner && !canManageInventory) || (bulkAction === "restock" && trackedItemCount === 0)}
                          aria-label={bulkAction === "dailyLimit"
                            ? `Daily limit for all ${category} items`
                            : `Restock all tracked ${category} items to this stock level`}
                          placeholder={bulkAction === "dailyLimit" ? "Mixed" : "Stock"}
                          className="w-24 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-right text-sm text-gray-900 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                      </label>
                      {bulkAction === "restock" && (
                        <p className="text-[10px] text-gray-500 sm:text-right">
                          Applies to tracked items only; tracking is not enabled automatically.
                        </p>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="grid gap-2 border-t border-gray-200 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-3">
                      {items.map((item) => {
                        const itemInventory = inventoryItems[item.id];
                        return (
                          <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex min-w-0 items-center gap-3 p-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[9px] text-gray-400">No image</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-gray-900">{item.name}</h3>
                                <p className="mt-0.5 truncate text-xs text-gray-500">₱{Number(item.price || 0).toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50 p-3">
                              <label className="text-[10px] font-medium text-gray-500 sm:text-xs">
                                Current stock
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={itemInventory?.stock ?? ""}
                                  onChange={(event) => handleInventoryChange(item.id, "stock", event.target.value)}
                                  disabled={!itemInventory?.isTrackable || (!isOwner && !canManageInventory)}
                                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </label>
                              <label className="text-[10px] font-medium text-gray-500 sm:text-xs">
                                Daily limit
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={itemInventory?.dailyLimit ?? ""}
                                  onChange={(event) => handleInventoryChange(item.id, "dailyLimit", event.target.value)}
                                  disabled={!isOwner && !canManageInventory}
                                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                              </label>
                              <div className="col-span-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600">Track stock</span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={itemInventory?.isTrackable ?? false}
                                  aria-label={`Track stock for ${item.name}`}
                                  onClick={() => handleToggleTrackable(item.id)}
                                  disabled={!isOwner && !canManageInventory}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                    itemInventory?.isTrackable ? "bg-emerald-600" : "bg-gray-300"
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    itemInventory?.isTrackable ? "translate-x-6" : "translate-x-1"
                                  }`} />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:rounded-2xl sm:py-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveInventory}
              disabled={inventoryLoading || (!isOwner && !canManageInventory)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:py-3"
            >
              {inventoryLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
