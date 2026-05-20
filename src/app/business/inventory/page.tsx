"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import BusinessInventoryModal from "@/components/business/BusinessInventoryModal";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import { useInventory } from "@/hooks/useInventory";
import { getBusinessByOwner } from "@/utils/businessCRUDMenu";

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
  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
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
          <BusinessOrdersNotifier businessId={business.id} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                  <p className="text-gray-600 mt-1">
                    Track and manage your menu item stock levels
                  </p>
                </div>
                <button
                  onClick={() => setShowInventoryModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Manage Inventory
                </button>
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
                  <div className="grid gap-4">
                    {menuItems.map((item) => {
                      const stockValue = inventory[item.id]?.stock ?? item.current_stock ?? null;
                      const stockInfo = getStockStatus(item, stockValue);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                  No img
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-500">{item.category || "No category"}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Stock Status</p>
                              <p className={`font-medium ${stockInfo.color}`}>
                                {stockInfo.status}
                              </p>
                            </div>

                            {item.is_trackable && (
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Current Stock</p>
                                <p className="font-medium text-gray-900">
                                  {stockValue ?? 0}
                                </p>
                              </div>
                            )}

                            <div className="text-right">
                              <p className="text-sm text-gray-500">Daily Limit</p>
                              <p className="font-medium text-gray-900">
                                {item.daily_limit || 0}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-gray-500">Tracking</p>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  item.is_trackable
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.is_trackable ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        />
      )}
    </div>
  );
}