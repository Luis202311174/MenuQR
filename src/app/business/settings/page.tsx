"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
});

export default function BusinessSettingsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [bussEmail, setBussEmail] = useState("");

  const [fb, setFb] = useState("");
  const [ig, setIg] = useState("");
  const [fp, setFp] = useState("");
  const [gr, setGr] = useState("");

  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      // get business
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", sess.user.id)
        .single();

      if (!biz) return;

      setLogoUrl(biz.logo_url || null);
      setBusinessId(biz.id);
      setName(biz.name || "");
      setAddress(biz.address || "");
      setContact(biz.contact_info || "");
      setBussEmail(biz.buss_email || "");

      if (biz.latitude && biz.longitude) {
        setCoordinates({
          lat: biz.latitude,
          lng: biz.longitude,
        });
      }

      // get socials
      const { data: socials } = await supabase
        .from("business_socials")
        .select("*")
        .eq("business_id", biz.id)
        .maybeSingle();

      if (socials) {
        setFb(socials.fb || "");
        setIg(socials.ig || "");
        setFp(socials.fp || "");
        setGr(socials.gr || "");
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  const resizeImageToSquare = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          512,
          512
        );

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Resize failed"));

          const newFile = new File([blob], file.name, {
            type: file.type,
          });

          resolve(newFile);
        }, file.type);
      };

      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (!businessId) return;

    try {
      setUploadingLogo(true);

      const processedFile = await resizeImageToSquare(file); // ✅ ADD THIS

      const fileExt = processedFile.name.split(".").pop();
      const fileName = `${businessId}-${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(filePath, processedFile, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("business-logos")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      await supabase
        .from("businesses")
        .update({ logo_url: publicUrl })
        .eq("id", businessId);

      setLogoUrl(publicUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name,
          address,
          contact_info: contact,
          buss_email: bussEmail,
          latitude: coordinates ? coordinates.lat : null,
          longitude: coordinates ? coordinates.lng : null,
        })
        .eq("id", businessId);

      if (error) {
        console.error("UPDATE ERROR:", error);
        alert("Failed to save location");
        return;
      }

      await supabase
        .from("business_socials")
        .upsert(
          {
            business_id: businessId,
            fb,
            ig,
            fp,
            gr,
          },
          { onConflict: "business_id" }
        );

      alert("Saved successfully!");
    } catch (err) {
      console.error(err);
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
      <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-3xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm border border-slate-200"
          >
            Show menu
          </button>
          <p className="text-xs font-semibold text-slate-600">Business settings</p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <div className="hidden lg:block">
            <BusinessSidebar ordersCount={ordersCount} />
          </div>

          {sidebarOpen && (
            <div className="lg:hidden">
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[90vw] max-w-xs overflow-y-auto bg-white shadow-xl border-r border-slate-200 p-6">
                <BusinessSidebar onClose={() => setSidebarOpen(false)} ordersCount={ordersCount} />
              </div>
            </div>
          )}

          <main className="space-y-4 sm:space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                  Business Configuration
                </p>
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">Configure Business</h1>
              </div>
              <div className="rounded-3xl bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700">
                Settings & profile details
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4 sm:space-y-8">
              <section className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                <div className="mb-4 sm:mb-6 flex flex-col gap-1 sm:gap-4">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-slate-900">Business Information</h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Update the details customers see on your menu page.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Business Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Business Email
                    </label>
                    <input
                      value={bussEmail}
                      onChange={(e) => setBussEmail(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="business@example.com"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3 lg:col-span-2">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Address
                    </label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Street, Barangay, City"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3 lg:col-span-2">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Location Pin
                    </label>
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
                      <MapPicker
                        coordinates={coordinates}
                        setCoordinates={setCoordinates}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Click on the map to update the exact business location.
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 lg:col-span-2">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Contact Information
                    </label>
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Phone number or email"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-xl font-semibold text-slate-900">Social Links</h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Add your external pages so customers can find you more easily.
                  </p>
                </div>

                <div className="grid gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Facebook Page
                    </label>
                    <input
                      value={fb}
                      onChange={(e) => setFb(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Instagram
                    </label>
                    <input
                      value={ig}
                      onChange={(e) => setIg(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="https://instagram.com/yourpage"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Foodpanda
                    </label>
                    <input
                      value={fp}
                      onChange={(e) => setFp(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Foodpanda store link"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Grab
                    </label>
                    <input
                      value={gr}
                      onChange={(e) => setGr(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Grab store link"
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 sm:space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Business preview</h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500">
                  This summary will help you verify the business details quickly.
                </p>

                <div className="flex justify-center mt-3 sm:mt-4">
                  <label className="relative group cursor-pointer">
                    
                    {/* LOGO IMAGE */}
                    <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Business Logo"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">No Logo</span>
                      )}
                    </div>

                    {/* HOVER OVERLAY */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {uploadingLogo ? "Uploading..." : "Change"}
                      </span>
                    </div>

                    {/* HIDDEN INPUT */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleLogoUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">Name</p>
                    <p className="mt-1 text-sm sm:text-base text-slate-900">{name || "Not set yet"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">Address</p>
                    <p className="mt-1 text-sm sm:text-base text-slate-900">{address || "Not set yet"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">Contact</p>
                    <p className="mt-1 text-sm sm:text-base text-slate-900">{contact || "Not set yet"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Quick tips</h3>
                <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
                  <li>Use a clear business name for easier search.</li>
                  <li>Keep your address and contact up to date.</li>
                  <li>Add social links to boost visibility.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-3xl bg-[#E23838] px-5 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#F2FF00] transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </main>
        </div>
      </div>
    </div>
    </>
  );
}