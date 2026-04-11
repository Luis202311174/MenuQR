"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

export default function BusinessMenuPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const [menuItems, setMenuItems] = useState<any[]>([]);

  // modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuCategory, setMenuCategory] = useState("Meals");
  const [customCategory, setCustomCategory] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // edit states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // =========================
  // AUTH + BUSINESS FETCH
  // =========================
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);

      if (!sess?.user) return router.push("/");

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

      const { data: bizData } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", sess.user.id)
        .single();

      if (bizData) {
        setBusinessId(bizData.id);
        setBusinessData(bizData);
      }
    };

    init();
  }, [router]);

  // =========================
  // FETCH MENU
  // =========================
  const fetchMenuItems = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    setMenuItems(data || []);
  };

  useEffect(() => {
    if (businessId) fetchMenuItems();
  }, [businessId]);

  // =========================
  // IMAGE UPLOAD
  // =========================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // =========================
  // SAVE MENU ITEM
  // =========================
  const handleSaveMenuItem = async () => {
    if (!menuName || !menuPrice || !businessId) {
      alert("Missing required fields");
      return;
    }

    setLoading(true);

    let imageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, imageFile);

      if (error) {
        alert("Upload failed");
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("menu_items").insert({
      business_id: businessId,
      name: menuName,
      category: menuCategory,
      price: Number(menuPrice),
      image_url: imageUrl,
      menu_desc: menuDescription || null,
      status: "available",
    });

    if (error) {
      alert("Failed to save");
    } else {
      await fetchMenuItems();
      setShowAddModal(false);
      setMenuName("");
      setMenuPrice("");
      setMenuDescription("");
      setImageFile(null);
      setImagePreview(null);
    }

    setLoading(false);
  };

  // =========================
  // EDIT MENU ITEM
  // =========================
  const openEdit = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price?.toString() || "");
    setEditDescription(item.menu_desc || "");
    setEditStatus(item.status || "available");
    setEditImagePreview(item.image_url || null);
  };

  const handleEditSave = async () => {
    if (!editingItem || !editName || !editPrice) {
      alert("Missing required fields");
      return;
    }

    setLoading(true);

    let imageUrl = editingItem.image_url;

    if (editImageFile) {
      const fileExt = editImageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, editImageFile);

      if (error) {
        alert("Upload failed");
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("menu_items")
      .update({
        name: editName,
        price: Number(editPrice),
        image_url: imageUrl,
        menu_desc: editDescription || null,
        status: editStatus,
      })
      .eq("id", editingItem.id);

    if (error) {
      alert("Failed to update");
    } else {
      await fetchMenuItems();
      setEditingItem(null);
      setEditName("");
      setEditPrice("");
      setEditDescription("");
      setEditStatus("available");
      setEditImageFile(null);
      setEditImagePreview(null);
    }

    setLoading(false);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  // =========================
  // UI
  // =========================
  if (!authChecked || !session) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        
        {/* SIDEBAR */}
        <BusinessSidebar />

        {/* CONTENT */}
        <main className="p-8 bg-white">
          <h1 className="text-3xl font-bold mb-6">Menu Management</h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="mb-6 bg-[#E23838] text-[#F2FF00] px-5 py-2 rounded"
          >
            + Add Item
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-200">
                <div className="h-40 w-full bg-gray-100 overflow-hidden">
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

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.menu_desc || "No description"}</p>
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-[#E23838] text-xl">₱{item.price}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.status === "available"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {item.status === "available" ? "Available" : "Not Available"}
                    </span>
                  </div>

                  <button
                    onClick={() => openEdit(item)}
                    className="w-full bg-[#E23838] text-[#F2FF00] px-4 py-2 rounded-lg font-semibold hover:bg-[#c22f2f] transition"
                  >
                    Edit Menu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-[32px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-200">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] p-6 lg:p-8">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-gray-500 font-semibold">
                      New Menu Item
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Add item details
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Provide a title, description, price and optional image so your customers can browse the dish clearly.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Menu Name
                      <input
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                        placeholder="Ex: Classic Beef Burger"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Description
                      <textarea
                        value={menuDescription}
                        onChange={(e) => setMenuDescription(e.target.value)}
                        className="mt-2 block w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                        placeholder="Write a short tasty description for this menu item"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Price
                      <input
                        type="number"
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                        placeholder="₱0.00"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] border border-dashed border-gray-300 bg-[#FEF5F5] p-5 text-center">
                    <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#FCEDEE] text-[#E23838] shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 104 4H3v-4zm0 0l4-4m12 4a4 4 0 114 4h-4v-4zm0 0l-4-4" />
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
                      className="mt-4 w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#E23838] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#c22f2f]"
                    />
                  </div>

                  {imagePreview ? (
                    <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-52 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
                      Image preview will appear here
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMenuItem}
                      className="rounded-2xl bg-[#E23838] px-5 py-3 text-sm font-semibold text-[#F2FF00] transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save Menu Item"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editingItem && (
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
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 104 4H3v-4zm0 0l4-4m12 4a4 4 0 114 4h-4v-4zm0 0l-4-4" />
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
                      onClick={() => setEditingItem(null)}
                      className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
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
      </div>
    </div>
  );
}