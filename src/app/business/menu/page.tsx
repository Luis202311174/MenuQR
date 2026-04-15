"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";
import BusinessMenuCard, { BusinessMenuCardItem } from "@/components/BusinessMenuCard";
import {
  fetchMenuItems as loadMenuItems,
  uploadMenuImage,
  createMenuItem,
  getBusinessByOwner,
} from "@/utils/businessCRUDMenu";

export default function BusinessMenuPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<BusinessMenuCardItem[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuCategory, setMenuCategory] = useState("Meals");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        }
      } catch (error) {
        console.error("Failed to load business:", error);
      }
    };

    init();
  }, [router]);

  const fetchMenuItems = async () => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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

      await createMenuItem({
        business_id: businessId,
        name: menuName,
        category: menuCategory,
        price: Number(menuPrice),
        availability: true,
        image_url: imageUrl,
        menu_desc: menuDescription || null,
      });

      await fetchMenuItems();
      setShowAddModal(false);
      setMenuName("");
      setMenuPrice("");
      setMenuDescription("");
      setImageFile(null);
      setImagePreview(null);
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
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        <BusinessSidebar />

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
              <BusinessMenuCard key={item.id} item={item} onUpdated={fetchMenuItems} />
            ))}
          </div>
        </main>

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
                      Provide a title, description, price and optional image so your customers
                      can browse the dish clearly.
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
                      className="mt-4 w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#E23838] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#c22f2f]"
                    />
                  </div>

                  {imagePreview ? (
                    <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                      <img src={imagePreview} alt="Preview" className="h-52 w-full object-cover" />
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
      </div>
    </div>
  );
}