"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
});

export default function BusinessSettingsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // business fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [bussEmail, setBussEmail] = useState("");

  // socials
  const [fb, setFb] = useState("");
  const [ig, setIg] = useState("");
  const [fp, setFp] = useState("");
  const [gr, setGr] = useState("");

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

      // get business
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", sess.user.id)
        .single();

      if (!biz) return;

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
    <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr] gap-8 px-4 py-8">
        <BusinessSidebar />

        <main className="space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                  Business Configuration
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Configure Business</h1>
              </div>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                Settings & profile details
              </div>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-8">
              <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Business Information</h2>
                    <p className="text-sm text-slate-500">
                      Update the details customers see on your menu page.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Business Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Business Email
                    </label>
                    <input
                      value={bussEmail}
                      onChange={(e) => setBussEmail(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="business@example.com"
                      type="email"
                    />
                  </div>

                  <div className="space-y-3 lg:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Address
                    </label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Street, Barangay, City"
                    />
                  </div>

                  <div className="space-y-3 lg:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
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

                  <div className="space-y-3 lg:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Contact Information
                    </label>
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Phone number or email"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Social Links</h2>
                  <p className="text-sm text-slate-500">
                    Add your external pages so customers can find you more easily.
                  </p>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Facebook Page
                    </label>
                    <input
                      value={fb}
                      onChange={(e) => setFb(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Instagram
                    </label>
                    <input
                      value={ig}
                      onChange={(e) => setIg(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="https://instagram.com/yourpage"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Foodpanda
                    </label>
                    <input
                      value={fp}
                      onChange={(e) => setFp(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Foodpanda store link"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Grab
                    </label>
                    <input
                      value={gr}
                      onChange={(e) => setGr(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                      placeholder="Grab store link"
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Business preview</h3>
                <p className="mt-2 text-sm text-slate-500">
                  This summary will help you verify the business details quickly.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Name</p>
                    <p className="mt-1 text-base text-slate-900">{name || "Not set yet"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Address</p>
                    <p className="mt-1 text-base text-slate-900">{address || "Not set yet"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Contact</p>
                    <p className="mt-1 text-base text-slate-900">{contact || "Not set yet"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Quick tips</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Use a clear business name for easier search.</li>
                  <li>Keep your address and contact up to date.</li>
                  <li>Add social links to boost visibility.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-3xl bg-[#E23838] px-8 py-3 text-sm font-bold text-[#F2FF00] transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}