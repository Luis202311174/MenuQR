"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MenuItem = {
  id: string;
  name: string;
  price: number | null;
  category: string;
  other_category?: string | null;
  image_url?: string | null;
  status?: string;
};

type Props = {
  menuItems: MenuItem[];
  refreshMenu: () => Promise<void>;
};

export default function BusinessMenuTiles({ menuItems, refreshMenu }: Props) {

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("available");

  const [editCategory, setEditCategory] = useState("meal");
  const [editCustomCategory, setEditCustomCategory] = useState("");

  const groupedMenus = menuItems.reduce((acc: any, item) => {
    const category =
      item.category === "other"
        ? item.other_category || "Other"
        : item.category;

    if (!acc[category]) acc[category] = [];
    acc[category].push(item);

    return acc;
  }, {});

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price?.toString() || "");
    setEditStatus(item.status || "available");
    setEditCategory(item.category);
    setEditCustomCategory(item.other_category || "");
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    const { error } = await supabase
        .from("menu_items")
        .update({
        name: editName,
        price: editPrice ? Number(editPrice) : null,
        category: editCategory,
        other_category:
            editCategory === "other" ? editCustomCategory : null,
        status: editStatus,
        })
        .eq("id", editingItem.id);

    if (error) {
        console.error(error);
        alert("Failed to update menu item");
        return;
    }

    setEditingItem(null);
    await refreshMenu();
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      console.error(error);
      alert("Failed to delete item");
      return;
    }

    setDeletingItem(null);
    await refreshMenu();
  };

  return (
    <>
      <div className="w-full max-w-5xl mt-12 space-y-10">
        {Object.entries(groupedMenus).map(([category, items]: any) => (
          <div key={category}>
            <h2 className="text-2xl font-bold capitalize mb-4">
              {category}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {items.map((item: MenuItem) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition overflow-hidden p-3"
                >
                  <div className="w-full h-32 bg-gray-100 rounded-md overflow-hidden mb-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No image
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold">{item.name}</h3>

                  <p className="text-gray-600 text-sm">
                    ₱{item.price ?? "-"}
                  </p>

                  <div className="mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.status === "available"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {item.status === "available" ? "Available" : "Not Available"}
                    </span>
                  </div>

                  <div className="flex justify-between mt-2 text-sm">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setDeletingItem(item)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px]">
            <h2 className="text-xl font-bold mb-4">Edit Menu Item</h2>

            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border p-2 rounded w-full mb-3"
              placeholder="Name"
            />

            <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="border p-2 rounded w-full mb-3"
                >
                <option value="meal">Meal</option>
                <option value="beverage">Beverage</option>
                <option value="solo">Solo</option>
                <option value="extras">Extras</option>
                <option value="other">Other</option>
            </select>

            {editCategory === "other" && (
                <input
                    type="text"
                    placeholder="Custom Category"
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    className="border p-2 rounded w-full mb-3"
                />
            )}

            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            >
              <option value="available">Available</option>
              <option value="not_available">Not Available</option>
            </select>

            <input
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="border p-2 rounded w-full mb-4"
              placeholder="Price"
              type="number"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-500"
              >
                Cancel
              </button>

              <button
                onClick={handleEditSave}
                className="bg-[#E23838] text-[#F2FF00] px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px] text-center">
            <h2 className="text-xl font-bold mb-4">
              Delete "{deletingItem.name}"?
            </h2>

            <p className="text-gray-600 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setDeletingItem(null)}
                className="text-gray-500"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}