import React, { useState } from "react";
import { uploadMenuImage, updateMenuItem } from "@/utils/businessCRUDMenu";

export type BusinessMenuCardItem = {
  id: string;
  name: string;
  category?: string;
  menu_desc?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  availability: boolean;
};

type BusinessMenuCardProps = {
  item: BusinessMenuCardItem;
  onUpdated: () => Promise<void> | void;
};

export default function BusinessMenuCard({ item, onUpdated }: BusinessMenuCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(
    item.price != null ? String(item.price) : ""
  );
  const [editDescription, setEditDescription] = useState(item.menu_desc || "");
  const [editCategory, setEditCategory] = useState(item.category || "Meals");
  const [editAvailability, setEditAvailability] = useState<boolean>(item.availability);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(item.image_url || null);
  const [loading, setLoading] = useState(false);

  const openEdit = () => {
    setEditName(item.name);
    setEditPrice(item.price != null ? String(item.price) : "");
    setEditDescription(item.menu_desc || "");
    setEditCategory(item.category || "Meals");
    setEditAvailability(item.availability);
    setEditImageFile(null);
    setEditImagePreview(item.image_url || null);
    setShowEditModal(true);
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
        menu_desc: editDescription || null,
      });

      await onUpdated();
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update menu item:", error);
      alert("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-200">
        <div className="h-40 w-full bg-gray-100 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No image
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{item.name}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {item.menu_desc || "No description"}
          </p>

          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-[#E23838] text-xl">₱{item.price ?? "0.00"}</p>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                item.availability ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {item.availability ? "Available" : "Not Available"}
            </span>
          </div>

          <button
            onClick={openEdit}
            className="w-full bg-[#E23838] text-[#F2FF00] px-4 py-2 rounded-lg font-semibold hover:bg-[#c22f2f] transition"
          >
            Edit Menu
          </button>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] p-6 lg:p-8">
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

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Menu Name
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Ex: Classic Beef Burger"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Description
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="mt-2 block w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Write a short tasty description for this menu item"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Category
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838]"
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
                      className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="₱0.00"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Status
                    <select
                      value={editAvailability ? "available" : "not_available"}
                      onChange={(e) => setEditAvailability(e.target.value === "available")}
                      className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                    >
                      <option value="available">Available</option>
                      <option value="not_available">Not Available</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-dashed border-gray-300 bg-[#FEF5F5] p-5 text-center">
                  <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#FCEDEE] text-[#E23838] shadow-sm">
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
                    className="mt-4 w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#E23838] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#c22f2f]"
                  />
                </div>

                {editImagePreview ? (
                  <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      className="h-52 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
                    Current image will appear here
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-2xl bg-[#E23838] px-5 py-3 text-sm font-semibold text-[#F2FF00] transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Menu Item"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}