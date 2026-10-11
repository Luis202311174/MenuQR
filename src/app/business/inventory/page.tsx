"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import BusinessInventoryModal from "@/components/business/BusinessInventoryModal";
import { useInventory } from "@/hooks/useInventory";
import { getBusinessByOwner, lazyResetInventoryForBusiness } from "@/utils/businessCRUDMenu";
import { hasStaffPermission } from "@/lib/staffPermissions";

type Business = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  contact_info?: string;
  email?: string;
  logo_url?: string;
  store_hours?: string;
  store_category?: string;
  qr_code_url?: string;
  fb?: string;
  ig?: string;
  fp?: string;
  gr?: string;
  socials?: {
    fb?: string;
    ig?: string;
    fp?: string;
    gr?: string;
  };
  cash_enabled?: boolean;
  gcash_enabled?: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  availability: boolean;
  description?: string;
  menu_desc?: string;
  is_trackable?: boolean;
  current_stock?: number;
  daily_limit?: number;
};

export default function BusinessInventoryPage() {
  const router = useRouter();
  const auth = useBusinessAuth("inventory", "view");
  const isOwner = auth.owner;
  const canManageInventory = !!(isOwner || (auth.staffSession && 
    hasStaffPermission(auth.staffSession, "inventory", "edit")));
  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const { inventory } = useInventory({ businessId: business?.id, enabled: Boolean(business?.id) });

  useEffect(() => {
    if (!auth.checked) return;

    const loadData = async () => {
      let resolvedBusiness: Business | null = business;

      try {
        if (!resolvedBusiness) {
          if (auth.owner) {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData.session;
            if (!session?.user) return;

            const ownerBusiness = await getBusinessByOwner(session.user.id);
            if (ownerBusiness) {
              resolvedBusiness = ownerBusiness;
              setBusiness(ownerBusiness);
            }
          }

          if (!resolvedBusiness && auth.staffSession) {
            const { data: businessData, error } = await supabase
              .from("businesses")
              .select("*")
              .eq("id", auth.staffSession.businessId)
              .single();

            if (!error && businessData) {
              resolvedBusiness = businessData as Business;
              setBusiness(resolvedBusiness);
            }
          }
        }

        if (!resolvedBusiness) {
          return;
        }

        try {
          await lazyResetInventoryForBusiness(resolvedBusiness.id);
        } catch (error) {
          console.warn("Auto-reset inventory failed:", error);
        }

        const { data: items, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("business_id", resolvedBusiness.id)
          .order("name");

        if (error) throw error;
        setMenuItems(items || []);
      } catch (error) {
        console.error("Error loading inventory data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [auth, business]);

  const handleRefetch = async () => {
    if (!business) return;

    const { data: items, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", business.id)
      .order("name");

    if (error) {
      console.error("Error refetching menu items:", error);
      return;
    }

    setMenuItems(items || []);
  };

  const getStockStatus = (item: MenuItem, stockValue: number | null) => {
    if (!item.is_trackable) return { status: "Not tracked", color: "text-gray-500" };
    if (!stockValue || stockValue <= 0) return { status: "Out of stock", color: "text-red-600" };
    if (stockValue <= 5) return { status: "Low stock", color: "text-yellow-600" };
    return { status: "In stock", color: "text-green-600" };
  };

  const getStockBadgeClass = (status: string) => {
    if (status === "Out of stock") return "bg-red-50 text-red-700";
    if (status === "Low stock") return "bg-amber-50 text-amber-700";
    if (status === "Not tracked") return "bg-gray-100 text-gray-600";
    return "bg-emerald-50 text-emerald-700";
  };

  const groupedInventory = useMemo(() => {
    const query = searchFilter.trim().toLocaleLowerCase();
    const filteredItems = menuItems.filter((item) =>
      !query ||
      item.name.toLocaleLowerCase().includes(query) ||
      (item.category || "No category").toLocaleLowerCase().includes(query)
    );

    return filteredItems.reduce<Record<string, MenuItem[]>>((groups, item) => {
      const category = item.category || "No category";
      (groups[category] ??= []).push(item);
      return groups;
    }, {});
  }, [menuItems, searchFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Business not found. Please log in again.</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <main className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                  <p className="text-gray-600 mt-1">
                    Track and manage your menu item stock levels
                  </p>
                </div>
                
                {/* 🔐 Add the permission check wrapper here: */}
                {canManageInventory && (
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Manage Inventory
                  </button>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="inventory-search" className="mb-2 block text-sm font-semibold text-gray-700">
                  Search inventory
                </label>
                <input
                  id="inventory-search"
                  type="search"
                  value={searchFilter}
                  onChange={(event) => setSearchFilter(event.target.value)}
                  placeholder="Search by item or category..."
                  className="block w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="space-y-4">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No menu items found.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add items to your menu first, then manage their inventory here.
                    </p>
                  </div>
                ) : (
                  <>
                    {Object.keys(groupedInventory).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                        No inventory items match “{searchFilter}”.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(groupedInventory)
                          .sort(([first], [second]) => first.localeCompare(second))
                          .map(([category, items]) => (
                            <details key={category} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-4 py-4 font-semibold text-gray-900 hover:bg-gray-100 [&::-webkit-details-marker]:hidden sm:px-5">
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className="truncate">{category}</span>
                                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm">
                                    {items.length} {items.length === 1 ? "item" : "items"}
                                  </span>
                                </span>
                                <svg className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                                </svg>
                              </summary>
                              <div className="grid gap-3 border-t border-gray-200 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                                {items.map((item) => {
                                  const stockValue = inventory[item.id]?.stock ?? item.current_stock ?? null;
                                  const stockInfo = getStockStatus(item, stockValue);
                                  return (
                                    <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                      <div className="flex min-w-0 items-center gap-3 p-3">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                          {item.image_url ? (
                                            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="grid h-full w-full place-items-center text-[10px] text-gray-400">No image</div>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h3 className="truncate font-semibold text-gray-900">{item.name}</h3>
                                          <p className="mt-0.5 truncate text-xs text-gray-500">
                                            ₱{Number(item.price || 0).toFixed(2)}
                                          </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStockBadgeClass(stockInfo.status)}`}>
                                          {stockInfo.status}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 bg-gray-50 py-2.5">
                                        <div className="px-2 text-center">
                                          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">Current stock</p>
                                          <p className="mt-1 text-sm font-semibold text-gray-900">{item.is_trackable ? stockValue ?? 0 : "—"}</p>
                                        </div>
                                        <div className="px-2 text-center">
                                          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">Daily limit</p>
                                          <p className="mt-1 text-sm font-semibold text-gray-900">{item.daily_limit ?? 0}</p>
                                        </div>
                                        <div className="px-2 text-center">
                                          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">Tracking</p>
                                          <p className={`mt-1 text-sm font-semibold ${item.is_trackable ? "text-emerald-700" : "text-gray-500"}`}>
                                            {item.is_trackable ? "On" : "Off"}
                                          </p>
                                        </div>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </details>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
      </div>

      {showInventoryModal && (
        <BusinessInventoryModal
          isOpen={showInventoryModal}
          businessId={business.id}
          menuItems={menuItems}
          onClose={() => setShowInventoryModal(false)}
          onRefetch={handleRefetch}
          canManageInventory={canManageInventory}
        />
      )}
    </div>
  );
}