"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import BusinessInventoryModal from "@/components/business/BusinessInventoryModal";
import BusinessMenuCard, { BusinessMenuCardItem } from "@/components/business/BusinessMenuCard";
import PageShell from "@/components/PageShell";

import {
  fetchMenuItems as loadMenuItems,
  uploadMenuImage,
  createMenuItem,
  createOptionGroup,
  createOption
} from "@/utils/businessCRUDMenu";

const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Eggs",
  "Shellfish",
  "Fish",
  "Wheat",
  "Soy",
  "Sesame",
  "Gluten",
  "Sulfites",
  "Mustard",
  "Celery",
  "Lupin",
];

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

const ORDERED_CATEGORIES = ["Meals", "Beverage", "Solo", "Extras", "Dessert"];

function BusinessMenuPageWithSearchParams() {
  const router = useRouter();
  const searchParams = useSearchParams();


  const auth = useBusinessAuth("menu", "view");

  // Staff-session based CUD gating (UI-level). Owners always have full access.
  const staffPermissions = auth.staffSession?.permissions || [];
  
  const hasMenuPermission = (action: "can_create" | "can_edit" | "can_delete") => 
    auth.owner || staffPermissions.some((p: any) => p.module_name === "menu" && p[action]);

  const canCreateMenu = hasMenuPermission("can_create");
  const canEditMenu = hasMenuPermission("can_edit");
  const canDeleteMenu = hasMenuPermission("can_delete");

  const [businessId, setBusinessId] = useState<string | null>(null);

  // ✅ SINGLE useEffect to determine businessId
  useEffect(() => {
    if (!auth.checked) return;

    if (auth.owner) {
      // For owners, use businessId from auth
      setBusinessId(auth.businessId);
    } else if (auth.staffSession) {
      // For staff, use businessId from staff session
      setBusinessId(auth.staffSession.businessId);
    } else {
      // No valid auth
      setBusinessId(null);
    }
  }, [auth.checked, auth.owner, auth.businessId, auth.staffSession]);

  const [menuItems, setMenuItems] = useState<BusinessMenuCardItem[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addMenuStep, setAddMenuStep] = useState(1);
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
  const [menuImagePosition, setMenuImagePosition] = useState("center");
  const [menuOptionGroups, setMenuOptionGroups] = useState<NewOptionGroup[]>([]);
  const addonsSectionRef = useRef<HTMLDivElement | null>(null);

  // Nutrition facts state
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [sodium, setSodium] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState("");
  const [selectedAllergenOption, setSelectedAllergenOption] = useState("");
  const [allergenOptions, setAllergenOptions] = useState<string[]>(COMMON_ALLERGENS);

  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionStatus, setNutritionStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [sameAsYesterdayLoading, setSameAsYesterdayLoading] = useState(false);

  // Note: useSearchParams() is used in a wrapper component with <Suspense />.
  const [showInventoryModal, setShowInventoryModal] = useState(false);



  useEffect(() => {
    if (!auth.checked || !businessId) return;

    const suggestedName = searchParams.get("aiSuggestionName");
    if (!suggestedName) return;

    setMenuName(suggestedName);
    setShowAddModal(true);
    router.replace("/business/menu");
  }, [auth.checked, businessId, searchParams, router]);

  const fetchMenuItems = async (): Promise<void> => {
    if (!businessId) return;

    try {
      const data = await loadMenuItems(businessId);
      setMenuItems(data);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
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

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unable to read image file."));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };


  const handleAutoGenerateNutrition = async () => {
    setNutritionError(null);
    setNutritionStatus(null);

    if (!menuName.trim()) {
      setNutritionError("Please enter the menu item name before generating nutrition facts.");
      return;
    }

    setNutritionLoading(true);
    try {
      const payload: Record<string, string> = {
        name: menuName.trim(),
      };

      if (imageFile) {
        payload.imageBase64 = await readFileAsDataUrl(imageFile);
      }

      const response = await fetch("/api/ai/nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate nutrition facts.");
      }

      const data = await response.json();
      setServingSize(data.servingSize || "");
      setCalories(data.calories?.toString() ?? "");
      setProtein(data.protein?.toString() ?? "");
      setCarbs(data.carbs?.toString() ?? "");
      setFat(data.fat?.toString() ?? "");
      setFiber(data.fiber?.toString() ?? "");
      setSugar(data.sugar?.toString() ?? "");
      setSodium(data.sodium?.toString() ?? "");

      setNutritionStatus(data.source
        ? `Nutrition facts auto-generated from ${data.source}. Please verify before saving.`
        : "Nutrition facts auto-generated. Please verify before saving.");
    } catch (error: any) {
      setNutritionError(error.message || "Could not generate nutrition facts.");
    } finally {
      setNutritionLoading(false);
    }
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
        image_position: menuImagePosition,
        menu_desc: menuDescription || null,
        daily_limit: menuTrackable ? Number(menuDailyLimit || 0) : 0,
        current_stock: menuTrackable ? Number(menuDailyLimit || 0) : undefined,
        is_trackable: menuTrackable,
        // Nutrition facts
        calories: calories ? Number(calories) : undefined,
        protein: protein ? Number(protein) : undefined,
        carbs: carbs ? Number(carbs) : undefined,
        fat: fat ? Number(fat) : undefined,
        fiber: fiber ? Number(fiber) : undefined,
        sugar: sugar ? Number(sugar) : undefined,
        sodium: sodium ? Number(sodium) : undefined,
        serving_size: servingSize || undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
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
      setMenuImagePosition("center");
      setMenuOptionGroups([]);
      // Reset nutrition facts
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");
      setSugar("");
      setSodium("");
      setServingSize("");
      setAllergens([]);
      setNewAllergen("");
    } catch (error) {
      console.error("Failed to save menu item:", error);
      alert("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (!auth.checked) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <>
      <PageShell title="Menu" subtitle="Manage menu items, inventory, and availability." backHref="/business/dashboard">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-sm font-semibold text-slate-600">{menuItems.length} items</p>
        </div>

        <div className="grid gap-8">
          <main className="space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">Menu Items</h2>
                <p className="text-sm text-slate-500">{menuItems.length} total items</p>
              </div>

              <div className="w-full">
                <label className="hidden text-sm text-slate-600 sm:block">
                  Search items
                </label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by name..."
                  className="mt-2 block w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-end gap-3 w-full">
                <div className="w-[140px] min-w-[140px] sm:w-[200px]">
                  <label className="hidden text-sm text-slate-600 sm:block">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="mt-2 block w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
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
                  <label className="hidden text-sm text-slate-600 sm:block">
                    Availability
                  </label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="mt-2 block w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                  >
                    <option value="All">All Items</option>
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setAddMenuStep(1);
                    setShowAddModal(true);
                  }}
                  disabled={!canCreateMenu}
                  aria-disabled={!canCreateMenu}
                  className="rounded-[24px] bg-blue-600 text-white font-bold px-6 py-3 text-sm transition hover:bg-blue-700 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
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
                  ...ORDERED_CATEGORIES.filter((cat) => grouped[cat]),
                  ...Object.keys(grouped).filter((cat) => !ORDERED_CATEGORIES.includes(cat)).sort(),
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

        {showAddModal && canCreateMenu && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200">
              <div className="max-h-[90vh] overflow-y-auto p-6 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      New Menu Item
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Step {addMenuStep} of 3
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {addMenuStep === 1
                        ? "Enter the item name, price, category, and description."
                        : addMenuStep === 2
                        ? "Add nutrition details and stock settings."
                        : "Upload an image and configure optional addons."
                      }
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 1, label: "Details" },
                        { id: 2, label: "Nutrition" },
                        { id: 3, label: "Image & Addons" },
                      ].map((step) => (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => setAddMenuStep(step.id)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            addMenuStep === step.id
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {step.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      {addMenuStep === 1 ? "Start here" : addMenuStep === 2 ? "Second" : "Final"}
                    </p>
                  </div>
                </div>

                {addMenuStep === 1 && (
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

                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                  </div>
                )}

                {addMenuStep === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Nutrition Facts</h3>
                          <p className="text-sm text-gray-500 mt-1">Optional details for customers with dietary needs.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoGenerateNutrition}
                          disabled={nutritionLoading}
                          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {nutritionLoading ? "Generating..." : "Auto-generate nutrition"}
                        </button>
                      </div>
                      {nutritionError ? (
                        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {nutritionError}
                        </p>
                      ) : null}
                      {nutritionStatus ? (
                        <p className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                          {nutritionStatus}
                        </p>
                      ) : null}
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <label className="block text-sm font-semibold text-gray-700">
                          Serving Size
                          <input
                            value={servingSize}
                            onChange={(e) => setServingSize(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="1 serving, 100g, 1 cup"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Calories
                          <input
                            type="number"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 320"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Protein (g)
                          <input
                            type="number"
                            value={protein}
                            onChange={(e) => setProtein(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 12"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Carbs (g)
                          <input
                            type="number"
                            value={carbs}
                            onChange={(e) => setCarbs(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 34"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Fat (g)
                          <input
                            type="number"
                            value={fat}
                            onChange={(e) => setFat(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 14"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Fiber (g)
                          <input
                            type="number"
                            value={fiber}
                            onChange={(e) => setFiber(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 4"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Sugar (g)
                          <input
                            type="number"
                            value={sugar}
                            onChange={(e) => setSugar(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 8"
                          />
                        </label>

                        <label className="block text-sm font-semibold text-gray-700">
                          Sodium (mg)
                          <input
                            type="number"
                            value={sodium}
                            onChange={(e) => setSodium(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                            placeholder="e.g. 300"
                          />
                        </label>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700">Allergens</label>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_auto] items-center">
                          <select
                            value={selectedAllergenOption}
                            onChange={(e) => {
                              setSelectedAllergenOption(e.target.value);
                              setNewAllergen(e.target.value);
                            }}
                            className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                          >
                            <option value="">Select common allergen</option>
                            {allergenOptions.map((allergen) => (
                              <option key={allergen} value={allergen}>
                                {allergen}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const cleaned = newAllergen.trim();
                              if (!cleaned) return;
                              setAllergens((current) => Array.from(new Set([...current, cleaned])));
                              setAllergenOptions((current) =>
                                current.some((item) => item.toLowerCase() === cleaned.toLowerCase())
                                  ? current
                                  : [...current, cleaned]
                              );
                              setNewAllergen("");
                              setSelectedAllergenOption("");
                            }}
                            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
                          >
                            Add
                          </button>
                        </div>
                        <input
                          value={newAllergen}
                          onChange={(e) => {
                            setNewAllergen(e.target.value);
                            setSelectedAllergenOption("");
                          }}
                          className="mt-3 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                          placeholder="Or type custom allergen"
                        />

                        {allergens.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {allergens.map((allergen) => (
                              <span
                                key={allergen}
                                className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 flex items-center gap-2"
                              >
                                {allergen}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAllergens((current) => current.filter((item) => item !== allergen))
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

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
                )}

                {addMenuStep === 3 && (
                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-dashed border-gray-300 bg-blue-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900">Menu Image</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Upload a photo and choose its position in one compact preview.
                          </p>
                        </div>
                        <div className="rounded-full border border-blue-200 bg-white p-3 text-blue-600 shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
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
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div className="flex flex-col gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                          />
                        </div>

                        <label className="block text-sm font-semibold text-gray-700">
                          Image Position
                          <select
                            value={menuImagePosition}
                            onChange={(e) => setMenuImagePosition(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                          >
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </label>

                        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-44 w-full object-cover"
                              style={{ objectPosition: menuImagePosition }}
                            />
                          ) : (
                            <div className="flex h-44 items-center justify-center bg-slate-50 px-4 text-sm text-gray-500">
                              No image selected yet. Upload a file to preview it here.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
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
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between items-center">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setAddMenuStep(1);
                      setMenuOptionGroups([]);
                      setMenuName("");
                      setMenuPrice("");
                      setMenuDescription("");
                      setImageFile(null);
                      setImagePreview(null);
                      setCalories("");
                      setProtein("");
                      setCarbs("");
                      setFat("");
                      setFiber("");
                      setSugar("");
                      setSodium("");
                      setServingSize("");
                      setAllergens([]);
                      setNewAllergen("");
                    }}
                    className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {addMenuStep > 1 ? (
                      <button
                        onClick={() => setAddMenuStep(addMenuStep - 1)}
                        className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Back
                      </button>
                    ) : null}
                    {addMenuStep < 3 ? (
                      <button
                        onClick={() => setAddMenuStep(addMenuStep + 1)}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveMenuItem}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={loading || !canCreateMenu}
                      >
                        {loading ? "Saving..." : "Save Menu Item"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <BusinessInventoryModal
        isOpen={showInventoryModal}
        businessId={businessId}
        menuItems={menuItems}
        onClose={() => setShowInventoryModal(false)}
        onRefetch={fetchMenuItems}
      />
      </PageShell>
    </>
  );
}

export default function BusinessMenuPage() {
  return (
    <Suspense fallback={null}>
      <BusinessMenuPageWithSearchParams />
    </Suspense>
  );
}

