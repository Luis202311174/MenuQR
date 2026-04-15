"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BusinessSidebar from "@/components/BusinessSidebar";

export default function BusinessSettingsPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const MapPicker = dynamic(() => import("@/components/MapPicker"), {
    ssr: false,
  });
  const [businessId, setBusinessId] = useState<string | null>(null);

  // business fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

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
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        
        <BusinessSidebar />

        <main className="p-8 bg-white space-y-10">
          <h1 className="text-3xl font-bold">Configure Business</h1>

          {/* BUSINESS INFO */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Business Information</h2>

            {/* Business Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Business Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="Enter business name"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Location Pin
              </label>
              <MapPicker
                coordinates={coordinates}
                setCoordinates={setCoordinates}
              />
              <p className="text-xs text-gray-500">
                Click on the map to set exact business location
              </p>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="Street, Barangay, City"
              />
            </div>

            {/* Contact */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Contact Information
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="Phone number or email"
              />
            </div>
          </section>

          {/* SOCIALS */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Social Links</h2>

            {/* Facebook */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Facebook Page
              </label>
              <input
                value={fb}
                onChange={(e) => setFb(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            {/* Instagram */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Instagram
              </label>
              <input
                value={ig}
                onChange={(e) => setIg(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            {/* Foodpanda */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Foodpanda
              </label>
              <input
                value={fp}
                onChange={(e) => setFp(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="Foodpanda store link"
              />
            </div>

            {/* Grab */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Grab
              </label>
              <input
                value={gr}
                onChange={(e) => setGr(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="Grab store link"
              />
            </div>
          </section>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#E23838] text-[#F2FF00] px-6 py-3 rounded font-bold"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </main>
      </div>
    </div>
  );
}