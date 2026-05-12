import React, { useState, useEffect } from "react";
import { uploadMenuImage,
  updateMenuItem,
  deleteMenuItem,
  fetchOptionGroups,
  createOptionGroup,
  deleteOptionGroup,
  createOption,
  deleteOption,
  updateOptionGroup,
  updateOption } from "@/utils/businessCRUDMenu";

export type BusinessMenuCardItem = {
  id: string;
  name: string;
  category?: string;
  menu_desc?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  image_position?: string;
  availability: boolean;
  is_trackable?: boolean;
  daily_limit?: number;
  current_stock?: number;
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

type OptionGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  menu_item_options: Option[];
};

type Option = {
  id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
};

type BusinessMenuCardProps = {
  item: BusinessMenuCardItem;
  onUpdated: () => Promise<void> | void;
};

export default function BusinessMenuCard({ item, onUpdated }: BusinessMenuCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddonsTab, setShowAddonsTab] = useState(false);
  
  // Edit item state
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(item.price != null ? String(item.price) : "");
  const [editDescription, setEditDescription] = useState(item.menu_desc || "");
  const [editCategory, setEditCategory] = useState(item.category || "Meals");
  const [editAvailability, setEditAvailability] = useState<boolean>(item.availability);
  const [editCalories, setEditCalories] = useState(item.calories != null ? String(item.calories) : "");
  const [editProtein, setEditProtein] = useState(item.protein != null ? String(item.protein) : "");
  const [editCarbs, setEditCarbs] = useState(item.carbs != null ? String(item.carbs) : "");
  const [editFat, setEditFat] = useState(item.fat != null ? String(item.fat) : "");
  const [editFiber, setEditFiber] = useState(item.fiber != null ? String(item.fiber) : "");
  const [editSugar, setEditSugar] = useState(item.sugar != null ? String(item.sugar) : "");
  const [editSodium, setEditSodium] = useState(item.sodium != null ? String(item.sodium) : "");
  const [editServingSize, setEditServingSize] = useState(item.serving_size || "");
  const [editAllergens, setEditAllergens] = useState<string[]>(item.allergens || []);
  const [newEditAllergen, setNewEditAllergen] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(item.image_url || null);
  const [editImagePosition, setEditImagePosition] = useState<string>(item.image_position || "center");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Addon management state
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMinSelect, setNewGroupMinSelect] = useState(0);
  const [newGroupMaxSelect, setNewGroupMaxSelect] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newOptionName, setNewOptionName] = useState<Record<string, string>>({});
  const [newOptionPrice, setNewOptionPrice] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!showDeleteModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDeleteModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal]);

  useEffect(() => {
    if (showAddonsTab) {
      loadOptionGroups();
    }
  }, [showAddonsTab]);

  const loadOptionGroups = async () => {
    try {
      const groups = await fetchOptionGroups(item.id);
      setOptionGroups(groups);
    } catch (error) {
      console.error("Failed to load option groups:", error);
    }
  };

  const openEdit = () => {
    setEditName(item.name);
    setEditPrice(item.price != null ? String(item.price) : "");
    setEditDescription(item.menu_desc || "");
    setEditCategory(item.category || "Meals");
    setEditAvailability(item.availability);
    setEditCalories(item.calories != null ? String(item.calories) : "");
    setEditProtein(item.protein != null ? String(item.protein) : "");
    setEditCarbs(item.carbs != null ? String(item.carbs) : "");
    setEditFat(item.fat != null ? String(item.fat) : "");
    setEditFiber(item.fiber != null ? String(item.fiber) : "");
    setEditSugar(item.sugar != null ? String(item.sugar) : "");
    setEditSodium(item.sodium != null ? String(item.sodium) : "");
    setEditServingSize(item.serving_size || "");
    setEditAllergens(item.allergens || []);
    setNewEditAllergen("");
    setEditImageFile(null);
    setEditImagePreview(item.image_url || null);
    setEditImagePosition(item.image_position || "center");
    setShowEditModal(true);
    setShowAddonsTab(false);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const priceValue = Number(editPrice);

    if (!editName || editPrice === "" || Number.isNaN(priceValue)) {
      alert("Missing required fields or invalid price");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = item.image_url;

      if (editImageFile) {
        imageUrl = await uploadMenuImage(editImageFile);
      }

      await updateMenuItem(item.id, {
        name: editName,
        category: editCategory,
        price: priceValue,
        availability: editAvailability,
        image_url: imageUrl,
        image_position: editImagePosition,
        menu_desc: editDescription || null,
        calories: editCalories ? Number(editCalories) : undefined,
        protein: editProtein ? Number(editProtein) : undefined,
        carbs: editCarbs ? Number(editCarbs) : undefined,
        fat: editFat ? Number(editFat) : undefined,
        fiber: editFiber ? Number(editFiber) : undefined,
        sugar: editSugar ? Number(editSugar) : undefined,
        sodium: editSodium ? Number(editSodium) : undefined,
        serving_size: editServingSize || undefined,
        allergens: editAllergens.length > 0 ? editAllergens : undefined,
      });

      await onUpdated();
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update menu item:", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      alert("Failed to update menu item: " + (message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddOptionGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Group name is required");
      return;
    }

    try {
      await createOptionGroup(
        item.id,
        newGroupName,
        newGroupRequired,
        newGroupMinSelect,
        newGroupMaxSelect
      );
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupMinSelect(0);
      setNewGroupMaxSelect(1);
      await loadOptionGroups();
    } catch (error) {
      console.error("Failed to create option group:", error);
      alert("Failed to create group");
    }
  };

  const handleDeleteOptionGroup = async (groupId: string) => {
    if (!window.confirm("Delete this option group?")) return;

    try {
      await deleteOptionGroup(groupId);
      await loadOptionGroups();
    } catch (error) {
      console.error("Failed to delete option group:", error);
      alert("Failed to delete group");
    }
  };

  const handleAddOption = async (groupId: string) => {
    const optionName = newOptionName[groupId]?.trim();
    const optionPrice = newOptionPrice[groupId]?.trim();

    if (!optionName) {
      alert("Option name is required");
      return;
    }

    const priceModifier = optionPrice ? Number(optionPrice) : 0;
    if (Number.isNaN(priceModifier)) {
      alert("Invalid price");
      return;
    }

    try {
      await createOption(groupId, optionName, priceModifier, true);
      setNewOptionName({ ...newOptionName, [groupId]: "" });
      setNewOptionPrice({ ...newOptionPrice, [groupId]: "" });
      await loadOptionGroups();
    } catch (error) {
      console.error("Failed to create option:", error);
      alert("Failed to create option");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm("Delete this option?")) return;

    try {
      await deleteOption(optionId);
      await loadOptionGroups();
    } catch (error) {
      console.error("Failed to delete option:", error);
      alert("Failed to delete option");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await deleteMenuItem(item.id);
      await onUpdated();
      setShowDeleteModal(false);
      setShowEditModal(false);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateOption = async (groupId: string, option: Option, newName: string, newPrice: string) => {
    if (!newName.trim()) {
      alert("Option name is required");
      return;
    }

    const priceModifier = newPrice ? Number(newPrice) : 0;
    if (Number.isNaN(priceModifier)) {
      alert("Invalid price");
      return;
    }

    try {
      await updateOption(option.id, newName, priceModifier, option.is_available);
      await loadOptionGroups();
    } catch (error) {
      console.error("Failed to update option:", error);
      alert("Failed to update option");
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition">
      <div className="w-full h-36 bg-gray-100 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: item.image_position || "center" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2">
            {item.name}
          </h3>

          <span
            className={`shrink-0 text-[10px] px-2 py-1 rounded-full font-medium ${
              item.availability
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {item.availability ? "Active" : "Sold out"}
          </span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2">
          {item.menu_desc || "No description"}
        </p>
        <div className="mt-auto pt-2">
          <p className="text-blue-600 font-bold text-base">
            ₱{item.price ?? "0.00"}
          </p>
          {item.calories != null && (
            <p className="text-xs text-gray-500 mt-1">
              ~{item.calories} cal
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={openEdit}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-semibold active:scale-[0.98] transition"
          >
            Edit
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-blue-200 text-blue-600 active:scale-[0.98] transition"
          >
            Delete
          </button>
        </div>

      </div>
    </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto">
            {/* Tab buttons */}
            <div className="sticky top-0 bg-white border-b border-gray-200 flex">
              <button
                onClick={() => setShowAddonsTab(false)}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition ${
                  !showAddonsTab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Item Details
              </button>
              <button
                onClick={() => setShowAddonsTab(true)}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition ${
                  showAddonsTab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Addons & Options
              </button>
            </div>

            <div className="p-6 lg:p-8">
              {!showAddonsTab ? (
                // Item Details Tab
                <div className="space-y-5">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      Edit Menu Item
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Update item details
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Modify the name, description, price and image for this menu item.
                    </p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-gray-700">
                        Menu Name
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                          placeholder="Ex: Classic Beef Burger"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-gray-700">
                        Description
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="mt-2 block w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                          placeholder="Write a short tasty description for this menu item"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-gray-700">
                        Category
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
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
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                          placeholder="₱0.00"
                        />
                      </label>

                      <div className="rounded-3xl border border-gray-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-semibold text-slate-900">Nutrition Facts</h3>
                        <div className="grid gap-4 sm:grid-cols-2 mt-3">
                          <label className="block text-sm font-semibold text-gray-700">
                            Serving Size
                            <input
                              value={editServingSize}
                              onChange={(e) => setEditServingSize(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="1 serving, 100g, 1 cup"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Calories
                            <input
                              type="number"
                              value={editCalories}
                              onChange={(e) => setEditCalories(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 320"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Protein (g)
                            <input
                              type="number"
                              value={editProtein}
                              onChange={(e) => setEditProtein(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 12"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Carbs (g)
                            <input
                              type="number"
                              value={editCarbs}
                              onChange={(e) => setEditCarbs(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 34"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Fat (g)
                            <input
                              type="number"
                              value={editFat}
                              onChange={(e) => setEditFat(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 14"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Fiber (g)
                            <input
                              type="number"
                              value={editFiber}
                              onChange={(e) => setEditFiber(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 4"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Sugar (g)
                            <input
                              type="number"
                              value={editSugar}
                              onChange={(e) => setEditSugar(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 8"
                            />
                          </label>

                          <label className="block text-sm font-semibold text-gray-700">
                            Sodium (mg)
                            <input
                              type="number"
                              value={editSodium}
                              onChange={(e) => setEditSodium(e.target.value)}
                              className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                              placeholder="e.g. 300"
                            />
                          </label>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700">
                            Allergens
                            <div className="mt-2 flex gap-2 items-center">
                              <input
                                value={newEditAllergen}
                                onChange={(e) => setNewEditAllergen(e.target.value)}
                                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                                placeholder="e.g. nuts, dairy, gluten"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const cleaned = newEditAllergen.trim();
                                  if (!cleaned) return;
                                  setEditAllergens((current) => Array.from(new Set([...current, cleaned])));
                                  setNewEditAllergen("");
                                }}
                                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
                              >
                                Add
                              </button>
                            </div>
                          </label>

                          {editAllergens.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {editAllergens.map((allergen) => (
                                <span
                                  key={allergen}
                                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 flex items-center gap-2"
                                >
                                  {allergen}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditAllergens((current) => current.filter((item) => item !== allergen))
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

                      <label className="block text-sm font-semibold text-gray-700">
                        Status
                        <select
                          value={editAvailability ? "available" : "not_available"}
                          onChange={(e) => setEditAvailability(e.target.value === "available")}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
                        >
                          <option value="available">Available</option>
                          <option value="not_available">Not Available</option>
                        </select>
                      </label>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-dashed border-gray-300 bg-[#FEF5F5] p-5 text-center">
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
                        <p className="text-sm font-semibold text-slate-900">Update Menu Image</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Upload a new photo to replace the current image.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          className="mt-4 w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                        />

                        <label className="block text-sm font-semibold text-gray-700 mt-4 text-left">
                          Image Position
                          <select
                            value={editImagePosition}
                            onChange={(e) => setEditImagePosition(e.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                          >
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                      </div>

                      {editImagePreview ? (
                        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                          <img
                            src={editImagePreview}
                            alt="Preview"
                            className="h-52 w-full object-cover"
                            style={{ objectPosition: editImagePosition }}
                          />
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
                          Current image will appear here
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update Menu Item"}
                    </button>
                  </div>
                </div>
              ) : (
                // Addons & Options Tab
                <div className="space-y-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      Customize Menu Item
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Add Option Groups
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Create addon groups like Size, Drinks, Extras etc. and add options with price modifiers.
                    </p>
                  </div>

                  {/* Add New Option Group */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-4">
                    <h3 className="font-semibold text-slate-900">Add New Option Group</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <label className="block text-sm font-semibold text-gray-700">
                        Group Name
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="e.g., Size, Addons, Drinks"
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                        />
                      </label>

                      <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 pt-8">
                        <input
                          type="checkbox"
                          checked={newGroupRequired}
                          onChange={(e) => setNewGroupRequired(e.target.checked)}
                          className="rounded"
                        />
                        <span>Required Selection</span>
                      </label>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <label className="block text-sm font-semibold text-gray-700">
                        Min Select
                        <input
                          type="number"
                          min="0"
                          value={newGroupMinSelect}
                          onChange={(e) => setNewGroupMinSelect(Number(e.target.value))}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-gray-700">
                        Max Select
                        <input
                          type="number"
                          min="1"
                          value={newGroupMaxSelect}
                          onChange={(e) => setNewGroupMaxSelect(Number(e.target.value))}
                          className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleAddOptionGroup}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition"
                    >
                      + Add Option Group
                    </button>
                  </div>

                  {/* Existing Option Groups */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900">
                      Option Groups ({optionGroups.length})
                    </h3>

                    {optionGroups.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No option groups yet. Create your first one above.</p>
                      </div>
                    ) : (
                      optionGroups.map((group) => (
                        <div key={group.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                          <button
                            onClick={() => toggleGroupExpand(group.id)}
                            className="w-full bg-gray-50 hover:bg-gray-100 px-5 py-4 flex items-center justify-between transition"
                          >
                            <div className="text-left">
                              <p className="font-semibold text-slate-900">{group.name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {group.menu_item_options.length} options
                                {group.is_required && " • Required"}
                              </p>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${
                                expandedGroups.has(group.id) ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                          </button>

                          {expandedGroups.has(group.id) && (
                            <div className="px-5 py-5 space-y-5 border-t border-gray-200 bg-white">
                              {/* Options List */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Options</h4>
                                {group.menu_item_options.length === 0 ? (
                                  <p className="text-sm text-gray-500">No options yet</p>
                                ) : (
                                  <div className="space-y-3">
                                    {group.menu_item_options.map((option) => (
                                      <div key={option.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg group">
                                        <div className="flex-1 text-sm">
                                          <p className="font-medium text-slate-900">{option.name}</p>
                                          <p className="text-gray-600">
                                            {option.price_modifier > 0
                                              ? `+₱${option.price_modifier}`
                                              : option.price_modifier < 0
                                              ? `₱${option.price_modifier}`
                                              : "Free"}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteOption(option.id)}
                                          className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition p-2"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Add Option to Group */}
                              <div className="border-t border-gray-200 pt-5">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Add Option</h4>
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={newOptionName[group.id] || ""}
                                    onChange={(e) =>
                                      setNewOptionName({
                                        ...newOptionName,
                                        [group.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Option name (e.g., Small, Regular, Large)"
                                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                                  />
                                  <input
                                    type="number"
                                    value={newOptionPrice[group.id] || ""}
                                    onChange={(e) =>
                                      setNewOptionPrice({
                                        ...newOptionPrice,
                                        [group.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Price modifier (0 for free)"
                                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600"
                                  />
                                  <button
                                    onClick={() => handleAddOption(group.id)}
                                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
                                  >
                                    + Add Option
                                  </button>
                                </div>
                              </div>

                              {/* Delete Group Button */}
                              <button
                                onClick={() => handleDeleteOptionGroup(group.id)}
                                className="w-full text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-semibold text-sm transition border border-red-200"
                              >
                                Delete Group
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-4">
                    <button
                      onClick={() => {
                        setShowAddonsTab(false);
                      }}
                      className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Back to Details
                    </button>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">
              Delete Menu Item
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {item.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}