
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BusinessMenuCardItem } from "@/components/business/BusinessMenuCard";
import { resetInventoryForBusiness, lazyResetInventoryForBusiness } from "@/utils/businessCRUDMenu";
import { InventoryManager } from "@/utils/inventoryManager";
import { useInventory } from "@/hooks/useInventory";

interface BusinessInventoryModalProps {
  isOpen: boolean;
  businessId: string | null;
  menuItems: BusinessMenuCardItem[];
  onClose: () => void;
  onRefetch: () => Promise<void>;
}

export default function BusinessInventoryModal({
  isOpen,
  businessId,
  menuItems,
  onClose,
  onRefetch,
}: BusinessInventoryModalProps) {
  const [inventorySearchFilter, setInventorySearchFilter] = useState("");
  const [inventoryItems, setInventoryItems] = useState<
    Record<string, { stock: string; isTrackable: boolean }>
    >({});
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Initialize inventory when modal opens
  useEffect(() => {
    if (isOpen && businessId) {
      const initialInventory: Record<string, { stock: string; isTrackable: boolean }> = {};

        menuItems.forEach(item => {
        initialInventory[item.id] = {
            stock: String(item.daily_limit || 0),
            isTrackable: item.is_trackable ?? false,
        };
        });

        setInventoryItems(initialInventory);
      setInventorySearchFilter("");
    }
  }, [isOpen, menuItems]);

  const handleInventoryChange = (itemId: string, value: string) => {
    setInventoryItems(prev => ({
        ...prev,
        [itemId]: {
        ...prev[itemId],
        stock: value
        }
    }));
    };

    const handleToggleTrackable = (itemId: string) => {
        setInventoryItems(prev => {
            const current = prev[itemId];

            return {
            ...prev,
            [itemId]: {
                stock: current.isTrackable ? "0" : current.stock || "1",
                isTrackable: !current.isTrackable,
            }
            };
        });
        };

  const handleSaveInventory = async () => {
    if (!businessId) return;

    setInventoryLoading(true);
    try {
      const updates = Object.entries(inventoryItems).map(([itemId, data]) => {
        const stockNum = parseInt(data.stock) || 0;

        return supabase
            .from("menu_items")
            .update({
            daily_limit: data.isTrackable ? stockNum : 0,
            current_stock: data.isTrackable ? stockNum : null,
            is_trackable: data.isTrackable,
            })
            .eq("id", itemId);
        });

      await Promise.all(updates);
      await onRefetch();
      onClose();
    } catch (error) {
      console.error("Failed to save inventory:", error);
      alert("Failed to save inventory changes");
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleInventorySameAsYesterday = async () => {
    if (!businessId) return;

    setInventoryLoading(true);
    try {
      await resetInventoryForBusiness(businessId);
      await onRefetch();
      // Modal stays open with updated values via useEffect
    } catch (error) {
      console.error("Failed to reset inventory:", error);
      alert("Failed to reset inventory");
    } finally {
      setInventoryLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredItems = menuItems.filter(item =>
    inventorySearchFilter === "" ||
    item.name.toLowerCase().includes(inventorySearchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200">
        <div className="max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 lg:p-8 border-b border-gray-200">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                Inventory Management
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Manage Stock Levels
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Set daily stock limits for your menu items. Items with 0 stock won't be tracked.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              ✕ Close
            </button>
          </div>

          <div className="p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
            {/* Top Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div className="w-full sm:w-80">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Items
                </label>
                <input
                  type="text"
                  value={inventorySearchFilter}
                  onChange={(e) => setInventorySearchFilter(e.target.value)}
                  placeholder="Search menu items..."
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600"
                />
              </div>

              <button
                onClick={handleInventorySameAsYesterday}
                disabled={inventoryLoading}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              >
                {inventoryLoading ? "Resetting..." : "📅 Same as Yesterday"}
              </button>
            </div>

            {/* Inventory List */}
            <div className="flex-1 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 font-semibold text-gray-700">Item</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Price</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Stock</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Daily Limit</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Trackable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-gray-300 flex items-center justify-center text-xs text-gray-500">
                                  No img
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.category || "No category"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">₱{item.price}</td>
                        <td className="px-4 py-4 text-gray-700">
                          <span className="font-semibold text-slate-900">
                            {item.current_stock ?? 0}
                          </span>
                          <span className="text-gray-500"> / {item.daily_limit ?? 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            value={inventoryItems[item.id]?.stock || "0"}
                            onChange={(e) => handleInventoryChange(item.id, e.target.value)}
                            disabled={!inventoryItems[item.id]?.isTrackable}
                            className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-center outline-none transition focus:border-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </td>
                        <td className="px-4 py-4">
                        <button
                            onClick={() => handleToggleTrackable(item.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            inventoryItems[item.id]?.isTrackable ? "bg-green-500" : "bg-gray-300"
                            }`}
                        >
                            <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                inventoryItems[item.id]?.isTrackable ? "translate-x-6" : "translate-x-1"
                            }`}
                            />
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {inventorySearchFilter ? "No items match your search" : "No menu items found"}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInventory}
                disabled={inventoryLoading}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inventoryLoading ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

