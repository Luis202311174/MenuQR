"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import BusinessMenuCard, { BusinessMenuCardItem } from "@/components/business/BusinessMenuCard";
import PageShell from "@/components/PageShell";
import {
  fetchMenuItems as loadMenuItems,
  uploadMenuImage,
  createMenuItem,
  createOptionGroup,
  createOption,
  getBusinessByOwner,
  resetInventoryForBusiness,
  lazyResetInventoryForBusiness,
} from "@/utils/businessCRUDMenu";

type NewMenuOption = {
  id: string;
  name: string;
  price: string;
};

type NewOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: NewMenuOption[];
};

export default function BusinessMenuPage() {
  const router = useRouter();

  const orderedCategories = ["Meals", "Beverage", "Solo", "Extras", "Dessert"];

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<BusinessMenuCardItem[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuCategory, setMenuCategory] = useState("Meals");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [searchFilter, setSearchFilter] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuDailyLimit, setMenuDailyLimit] = useState("0");
  const [menuTrackable, setMenuTrackable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [menuOptionGroups, setMenuOptionGroups] = useState<NewOptionGroup[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const addonsSectionRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [sameAsYesterdayLoading, setSameAsYesterdayLoading] = useState(false);

  // Inventory modal state
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventorySearchFilter, setInventorySearchFilter] = useState("");
  const [inventoryItems, setInventoryItems] = useState<Record<string, string>>({}); // itemId -> stock value
  const [inventoryLoading, setInventoryLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);

      if (!sess?.user) {
        router.push("/");
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", sess.user.id)
        .single();

      if (user?.role !== "owner") {
        router.push("/");
        return;
      }

      setSession(sess);

      try {
        const bizData = await getBusinessByOwner(sess.user.id);
        if (bizData) {
          setBusinessId(bizData.id);
          try {
            const resetPerformed = await lazyResetInventoryForBusiness(bizData.id);
            if (resetPerformed) {
              await fetchMenuItems();
            }
          } catch (resetError) {
            console.error("Failed to perform lazy inventory reset:", resetError);
          }
        }
      } catch (error) {
        console.error("Failed to load business:", error);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  const fetchMenuItems = async () => {
    if (!businessId) return [];

    try {
      const data = await loadMenuItems(businessId);
      setMenuItems(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      return [];
    }
  };

  const handleResetSameAsYesterday = async () => {
    if (!businessId) return;

    setSameAsYesterdayLoading(true);
    try {
      await resetInventoryForBusiness(businessId);
      await fetchMenuItems();
    } catch (error) {
      console.error("Failed to reset inventory to yesterday's limit:", error);
      alert("Unable to reset inventory. Please try again.");
    } finally {
      setSameAsYesterdayLoading(false);
    }
  };

  const openInventoryModal = async () => {
    const latestMenuItems = businessId ? await fetchMenuItems() : menuItems;

    // Initialize inventory values from current menu items
    const initialInventory: Record<string, string> = {};
    (latestMenuItems || menuItems).forEach(item => {
      if (item.is_trackable) {
        initialInventory[item.id] = String(item.daily_limit || 0);
      }
    });
    setInventoryItems(initialInventory);
    setInventorySearchFilter("");
    setShowInventoryModal(true);
  };

  const handleInventoryChange = (itemId: string, value: string) => {
    setInventoryItems(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSaveInventory = async () => {
    if (!businessId) return;

    setInventoryLoading(true);
    try {
      // Update each item's inventory settings
      const updates = Object.entries(inventoryItems).map(async ([itemId, stockValue]) => {
        const stockNum = parseInt(stockValue) || 0;
        const isTrackable = stockNum > 0;

        return supabase
          .from("menu_items")
          .update({
            daily_limit: isTrackable ? stockNum : 0,
            current_stock: isTrackable ? stockNum : null,
            is_trackable: isTrackable,
          })
          .eq("id", itemId);
      });

      await Promise.all(updates);
      await fetchMenuItems();
      setShowInventoryModal(false);
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
      await fetchMenuItems();
      // Re-initialize the modal with updated values
      openInventoryModal();
    } catch (error) {
      console.error("Failed to reset inventory:", error);
      alert("Failed to reset inventory");
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) fetchMenuItems();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;

    const menuChannel = supabase.channel(`business-menu-items-${businessId}`);
    menuChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `business_id=eq.${businessId}`,
      },
      async () => {
        await fetchMenuItems();
      }
    );

    void menuChannel.subscribe();

    return () => {
      void menuChannel.unsubscribe();
    };
  }, [businessId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAddNewOptionGroup = () => {
    setMenuOptionGroups((current) => [
      ...current,
      {
        id: Math.random().toString(36).slice(2, 10),
        name: "",
        isRequired: false,
        minSelect: 0,
        maxSelect: 1,
        options: [],
      },
    ]);
  };

  const handleSaveMenuItem = async () => {
    if (!menuName || !menuPrice || !businessId) {
      alert("Missing required fields");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadMenuImage(imageFile);
      }

      const createdItem = await createMenuItem({
        business_id: businessId,
        name: menuName,
        category: menuCategory,
        price: Number(menuPrice),
        availability: true,
        image_url: imageUrl,
        menu_desc: menuDescription || null,
        daily_limit: menuTrackable ? Number(menuDailyLimit || 0) : 0,
        current_stock: menuTrackable ? Number(menuDailyLimit || 0) : undefined,
        is_trackable: menuTrackable,
      });

      if (!createdItem || !createdItem.id) {
        throw new Error("Failed to create menu item");
      }

      for (const group of menuOptionGroups) {
        if (!group.name.trim()) continue;

        const createdGroup = await createOptionGroup(
          createdItem.id,
          group.name,
          group.isRequired,
          group.minSelect,
          group.maxSelect
        );

        for (const option of group.options) {
          if (!option.name.trim()) continue;
          await createOption(createdGroup.id, option.name, Number(option.price) || 0);
        }
      }

      await fetchMenuItems();
      setShowAddModal(false);
      setMenuName("");
      setMenuPrice("");
      setMenuDescription("");
      setMenuDailyLimit("0");
      setMenuTrackable(true);
      setImageFile(null);
      setImagePreview(null);
      setMenuOptionGroups([]);
    } catch (error) {
      console.error("Failed to save menu item:", error);
      alert("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || !session) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <>
      <BusinessOrdersNotifier businessId={businessId} onCountChange={setOrdersCount} />
      <PageShell title="Menu" subtitle="Manage menu items, inventory, and availability." backHref="/business/dashboard">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-3xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm border border-slate-200"
          >
            Show menu
          </button>
          <p className="text-sm font-semibold text-slate-600">{menuItems.length} items</p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
              <div className="hidden lg:block self-start">
                <BusinessSidebar ordersCount={ordersCount} />
              </div>

          {sidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[90vw] max-w-xs overflow-y-auto bg-white shadow-xl border-r border-slate-200 p-6 lg:hidden">
                <BusinessSidebar onClose={() => setSidebarOpen(false)} ordersCount={ordersCount} />
              </div>
            </>
          )}

          <main className="space-y-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <h2 className="text-2xl font-bold w-full">Menu Items</h2>

              <div className="w-full">
                <label className="hidden text-sm text-gray-700 sm:block">
                  Search items
                </label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by name..."
                  className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-end gap-3 w-full">
                <div className="w-[140px] min-w-[140px] sm:w-[200px]">
                  <label className="hidden text-sm text-gray-700 sm:block">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600"
                  >
                    <option value="All">All Categories</option>
                    <option value="Meals">Meals</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Solo">Solo</option>
                    <option value="Extras">Extras</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>

                <div className="w-[140px] min-w-[140px] sm:w-[200px]">
                  <label className="hidden text-sm text-gray-700 sm:block">
                    Availability
                  </label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600"
                  >
                    <option value="All">All Items</option>
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>

                <button
                  onClick={openInventoryModal}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  📦 Inventory
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-2xl bg-blue-600 text-white font-bold px-6 py-3 text-sm transition hover:bg-blue-700 w-full sm:w-auto"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {menuItems.length > 0 ? (
              (() => {
                const filteredItems = menuItems.filter((item) => {
                  const categoryMatches =
                    categoryFilter === "All" || item.category === categoryFilter;
                  const availabilityMatches =
                    availabilityFilter === "All" ||
                    (availabilityFilter === "Available" && item.availability) ||
                    (availabilityFilter === "Not Available" && !item.availability);
                  const searchMatches =
                    searchFilter === "" ||
                    item.name.toLowerCase().includes(searchFilter.toLowerCase());
                  return categoryMatches && availabilityMatches && searchMatches;
                });

                const grouped = filteredItems.reduce((grouped, item) => {
                  const category = item.category || "Other";
                  if (!grouped[category]) grouped[category] = [];
                  grouped[category].push(item);
                  return grouped;
                }, {} as Record<string, typeof menuItems>);

                const categoryKeys = [
                  ...orderedCategories.filter((cat) => grouped[cat]),
                  ...Object.keys(grouped).filter((cat) => !orderedCategories.includes(cat)).sort(),
                ];

                if (filteredItems.length === 0) {
                  return (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
                      {searchFilter ? (
                        <p>No menu items found matching "{searchFilter}"</p>
                      ) : (
                        <p>No menu items match the selected filters.</p>
                      )}
                    </div>
                  );
                }

                return categoryKeys.map((category) => {
                  const items = grouped[category];
                  return (
                    <div key={category}>
                      <div className="mb-4 pb-3 border-b border-gray-300">
                        <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        {items.map((item) => (
                          <BusinessMenuCard key={item.id} item={item} onUpdated={fetchMenuItems} />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
                <p className="text-slate-500">No menu items yet</p>
                <p className="text-sm text-slate-400 mt-2">Add your first item to get started</p>
              </div>
            )}
          </div>
        </main>
      </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200">
              <div className="max-h-[90vh] overflow-y-auto p-6 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      New Menu Item
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Add item details
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Provide a title, description, price and optional image so your customers
                      can browse the dish clearly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addonsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="rounded-3xl border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Jump to Addons
                  </button>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Menu Name
                      <input
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                        placeholder="Ex: Classic Beef Burger"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Description
                      <textarea
                        value={menuDescription}
                        onChange={(e) => setMenuDescription(e.target.value)}
                        className="mt-2 block w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                        placeholder="Write a short tasty description for this menu item"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Category
                      <select
                        value={menuCategory}
                        onChange={(e) => setMenuCategory(e.target.value)}
                        className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                      >
                        <option value="Meals">Meals</option>
                        <option value="Beverage">Beverage</option>
                        <option value="Solo">Solo</option>
                        <option value="Extras">Extras</option>
                        <option value="Dessert">Dessert</option>
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Price
                      <input
                        type="number"
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                        placeholder="₱0.00"
                      />
                    </label>

                    <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={menuTrackable}
                        onChange={(e) => setMenuTrackable(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      Track inventory for this item
                    </label>

                    {menuTrackable && (
                      <label className="block text-sm font-semibold text-gray-700">
                        Daily Limit
                        <input
                          type="number"
                          min="0"
                          value={menuDailyLimit}
                          onChange={(e) => setMenuDailyLimit(e.target.value)}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                          placeholder="0"
                        />
                      </label>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-dashed border-gray-300 bg-blue-50 p-5 text-center">
                    <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 15a4 4 0 104 4H3v-4zm0 0l4-4m12 4a4 4 0 114 4h-4v-4zm0 0l-4-4"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Menu Image</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Upload a photo to help customers identify this item faster.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="mt-4 w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                    />
                  </div>
                </div>

                {imagePreview && (
                  <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <img src={imagePreview} alt="Preview" className="h-52 w-full object-cover" />
                  </div>
                )}

                <div
                  ref={addonsSectionRef}
                  className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] font-semibold text-slate-500">
                        Addons & Options
                      </p>
                      <p className="text-sm text-gray-500">
                        Optional — only add groups if this menu item has add-ons.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewOptionGroup}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                    >
                      + Add Group
                    </button>
                  </div>

                  {menuOptionGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 text-center">
                      No option groups yet. Add one only if this item has add-ons.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {menuOptionGroups.map((group, groupIndex) => (
                        <div key={group.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="font-semibold text-slate-900">Group {groupIndex + 1}</h4>
                            <button
                              type="button"
                              onClick={() =>
                                setMenuOptionGroups((prev) => prev.filter((g) => g.id !== group.id))
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Remove group
                            </button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm text-gray-700">
                              Group Name
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) =>
                                  setMenuOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id ? { ...g, name: e.target.value } : g
                                    )
                                  )
                                }
                                placeholder="e.g., Size, Addons, Drinks"
                                className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              />
                            </label>

                            <label className="block text-sm text-gray-700">
                              Required selection
                              <select
                                value={group.isRequired ? "yes" : "no"}
                                onChange={(e) =>
                                  setMenuOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, isRequired: e.target.value === "yes" }
                                        : g
                                    )
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </label>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm text-gray-700">
                              Min Select
                              <input
                                type="number"
                                min={0}
                                value={group.minSelect}
                                onChange={(e) =>
                                  setMenuOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, minSelect: Number(e.target.value) }
                                        : g
                                    )
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              />
                            </label>
                            <label className="block text-sm text-gray-700">
                              Max Select
                              <input
                                type="number"
                                min={1}
                                value={group.maxSelect}
                                onChange={(e) =>
                                  setMenuOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, maxSelect: Number(e.target.value) }
                                        : g
                                    )
                                  )
                                }
                                className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              />
                            </label>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">Group Options</p>
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? {
                                            ...g,
                                            options: [
                                              ...g.options,
                                              { id: Math.random().toString(36).slice(2, 10), name: "", price: "" },
                                            ],
                                          }
                                        : g
                                    )
                                  )
                                }
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                              >
                                + Add Option
                              </button>
                            </div>

                            {group.options.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                                Add options to this group so customers can choose when ordering.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {group.options.map((option) => (
                                  <div key={option.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <input
                                      type="text"
                                      value={option.name}
                                      onChange={(e) =>
                                        setMenuOptionGroups((prev) =>
                                          prev.map((g) =>
                                            g.id === group.id
                                              ? {
                                                  ...g,
                                                  options: g.options.map((opt) =>
                                                    opt.id === option.id
                                                      ? { ...opt, name: e.target.value }
                                                      : opt
                                                  ),
                                                }
                                              : g
                                          )
                                        )
                                      }
                                      placeholder="Option name"
                                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                                    />
                                    <input
                                      type="number"
                                      value={option.price}
                                      onChange={(e) =>
                                        setMenuOptionGroups((prev) =>
                                          prev.map((g) =>
                                            g.id === group.id
                                              ? {
                                                  ...g,
                                                  options: g.options.map((opt) =>
                                                    opt.id === option.id
                                                      ? { ...opt, price: e.target.value }
                                                      : opt
                                                  ),
                                                }
                                              : g
                                          )
                                        )
                                      }
                                      placeholder="Price modifier"
                                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMenuOptionGroups((prev) =>
                                          prev.map((g) =>
                                            g.id === group.id
                                              ? {
                                                  ...g,
                                                  options: g.options.filter((opt) => opt.id !== option.id),
                                                }
                                              : g
                                          )
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setMenuOptionGroups([]);
                      setMenuName("");
                      setMenuPrice("");
                      setMenuDescription("");
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMenuItem}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Menu Item"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Inventory Management Modal */}
      {showInventoryModal && (
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
                  onClick={() => setShowInventoryModal(false)}
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
                        {menuItems
                          .filter(item =>
                            inventorySearchFilter === "" ||
                            item.name.toLowerCase().includes(inventorySearchFilter.toLowerCase())
                          )
                          .map((item) => (
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
                                  value={inventoryItems[item.id] || "0"}
                                  onChange={(e) => handleInventoryChange(item.id, e.target.value)}
                                  className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-center outline-none transition focus:border-blue-600"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.is_trackable ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                                  {item.is_trackable ? "Yes" : "No"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {menuItems.filter(item =>
                    inventorySearchFilter === "" ||
                    item.name.toLowerCase().includes(inventorySearchFilter.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      {inventorySearchFilter ? "No items match your search" : "No menu items found"}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowInventoryModal(false)}
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
      )}
      </PageShell>
    </>
  );
}