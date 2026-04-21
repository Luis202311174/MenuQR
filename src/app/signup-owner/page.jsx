"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { supabase } from "../../lib/supabaseClient";
import { generateSlug } from "../../utils/generateSlug";
import { v4 as uuidv4 } from "uuid";
import StoreHoursPicker from "@/components/StoreHoursPicker";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
});

export default function SignupBusinessPage() {
  const router = useRouter();
  const [tempUser, setTempUser] = useState(null); // email/password user
  const [currentUser, setCurrentUser] = useState(null); // Google OAuth user

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [otherCtgry, setOtherCtgry] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeHours, setStoreHours] = useState({ open: "", close: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [coordinates, setCoordinates] = useState(null);

  const [loading, setLoading] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const formatPHNumber = (value) => {
    // remove everything except digits
    let digits = value.replace(/\D/g, "");

    // handle leading 0 (09xxxxxxxxx)
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // enforce PH format
    if (digits.startsWith("9")) {
      return "+63" + digits;
    }

    // if user already typed 63
    if (digits.startsWith("63")) {
      return "+" + digits;
    }

    return "+63" + digits;
  };

  // Enum categories
  const categories = ["restaurant", "stall", "cafe", "other"];

  useEffect(() => {
    const sessionData = JSON.parse(sessionStorage.getItem("signupUser"));
    if (sessionData) setTempUser(sessionData);

    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUser(data.user);
    };
    getUser();

    if (!sessionData && !currentUser) router.push("/signup-auth");
  }, [router, currentUser]);

  const resizeImageToSquare = async (file) => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const srcSize = Math.min(img.width, img.height);
        const maxSize = 512;
        const targetSize = Math.min(maxSize, srcSize);

        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.width;
        let srcHeight = img.height;

        if (img.width > img.height) {
          srcX = (img.width - img.height) / 2;
          srcWidth = img.height;
        } else if (img.height > img.width) {
          srcY = (img.height - img.width) / 2;
          srcHeight = img.width;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetSize, targetSize);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Image resize failed"));

          const resizedFile = new File([blob], file.name, { type: file.type || "image/jpeg" });
          resolve(resizedFile);
        }, file.type || "image/jpeg", 0.9);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for resizing"));
      };

      img.src = url;
    });
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return null;

    const processedFile = await resizeImageToSquare(logoFile);
    const fileExt = processedFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error } = await supabase.storage
      .from("business-logos")
      .upload(filePath, processedFile, { upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("business-logos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!businessName.trim() || !address.trim() || !storeCategory || !contactNumber.trim() || !storeEmail.trim() || !storeHours.open || !storeHours.close) {
      setLoading(false);
      return alert("Please fill in all required fields (Business name, address, category, contact number, contact email, open and close hours)");
    }

    const phoneRegex = /^\+639\d{9}$/;
    if (!phoneRegex.test(contactNumber.trim())) {
      setLoading(false);
      return alert("Contact number must start with +639 and be followed by 9 digits (e.g. +639171234567)");
    }

    try {
      let userId = null;

      // Email/password signup
      if (tempUser?.email && tempUser?.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: tempUser.email,
          password: tempUser.password,
        });
        if (authError) throw new Error(authError.message);
        
        // If signUp succeeded but no user returned, try signing in
        if (!authData?.user) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: tempUser.email,
            password: tempUser.password,
          });
          if (signInError) throw new Error(signInError.message);
          userId = signInData?.user?.id;
        } else {
          userId = authData.user.id;
        }

        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id;
        }
      }

      // Google OAuth signup
      if (!userId && currentUser) {
        userId = currentUser.id;
      }

      // Fallback to current session user
      if (!userId) {
        const { data: sessionUser } = await supabase.auth.getUser();
        userId = sessionUser?.user?.id;
      }

      if (!userId) throw new Error("No valid user found");

      // Upsert into users table (owner) to satisfy FK for business.owner_id
      const { error: userUpsertError } = await supabase
        .from("users")
        .upsert({ id: userId, role: "owner" }, { onConflict: "id" });

      if (userUpsertError) throw new Error(userUpsertError.message);

      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) logoUrl = await handleLogoUpload();

      // generate id + slug
      const businessId = uuidv4();
      const slug = generateSlug(businessId, businessName);

      // Insert business
      const { error: businessError } = await supabase.from("businesses").insert({
        id: businessId,
        owner_id: userId,
        name: businessName,
        description,
        address,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        store_category: storeCategory,
        other_ctgry: storeCategory === "other" ? otherCtgry : null,
        contact_info: contactNumber.trim(),
        buss_email: storeEmail.trim(),
        store_hours: `${storeHours.open} - ${storeHours.close}`,
        logo_url: logoUrl,
        slug: slug,
      });

      if (businessError) throw new Error(businessError.message);

      sessionStorage.removeItem("signupUser");
      // after initial registration take them to the business landing page
      router.push("/business");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create business account.");
    } finally {
      setLoading(false);
    }
  };

  if (!tempUser && !currentUser) return null;

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF4] px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full grid md:grid-cols-2">
        {/* left side: logo & tagline */}
        <div className="bg-white p-12 flex flex-col items-center justify-center">
          <img src="/hero-icon.png" alt="MenuQR Logo" width={300} height={240} className="mb-8" />
          <h3 className="text-4xl font-bold text-[#111] mb-3 text-center">
            Welcome to MenuQR
          </h3>
          <p className="text-2xl text-[#333] text-center font-semibold">
            Empower your business with dynamic menu management.
          </p>
        </div>

        {/* right side: form */}
        <div className="bg-[#E23838] p-12 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-center mb-6 text-white">
            Register your business
          </h1>

          <form className="space-y-6 mb-6 bg-white rounded-2xl p-6 shadow-lg" onSubmit={handleSubmit}>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Business details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={storeCategory}
                    onChange={(e) => setStoreCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  >
                    <option value="">Store Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {storeCategory === "other" && (
                <input
                  type="text"
                  placeholder="Other category"
                  value={otherCtgry}
                  onChange={(e) => setOtherCtgry(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3"
                  required
                />
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3"
                  rows={3}
                />
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Location Picker
              </h2>

              <MapPicker
                coordinates={coordinates}
                setCoordinates={setCoordinates}
              />

              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3"
                  required
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="Contact Number (e.g. 9171234567)"
                    value={contactNumber}
                    onChange={(e) => {
                      const formatted = formatPHNumber(e.target.value);
                      setContactNumber(formatted);
                    }}
                    className="w-full border border-gray-300 rounded-md p-3"
                    pattern="^\+639\d{9}$"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    placeholder="business@example.com"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <StoreHoursPicker value={storeHours} onChange={setStoreHours} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Logo upload</h2>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setLogoFile(file);
                }}
                className="w-full border border-gray-300 rounded-md p-2"
              />
              {logoFile && (
                <div className="w-28 h-28 overflow-hidden rounded-md border border-gray-300 mt-1">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </section>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-sm text-gray-700">
                I agree to the <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="underline text-blue-600"
                >business privacy policy</button>.
              </span>
            </label>
          {!agreePrivacy && (
            <p className="text-xs text-red-600">
              You must agree to the privacy policy to create an account.
            </p>
          )}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading || !agreePrivacy}
              className="bg-[#E23838] hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Saving..." : "Create Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

    {/* business privacy policy modal */}
    {showPrivacy && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 px-4 z-50">
        <div className="relative max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Business Privacy Policy</p>
              <h2 className="text-3xl font-bold text-slate-900">MenuQR Business Privacy</h2>
            </div>
            <button
              onClick={() => setShowPrivacy(false)}
              className="rounded-full bg-slate-100 px-3 py-2 text-xl font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto p-8" style={{ maxHeight: 'calc(90vh - 96px)' }}>
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-700">
                MenuQR is committed to protecting your business information and maintaining your trust. This policy explains how we collect, use, store, and share the business data provided while managing your restaurant or menu listing.
              </p>
            </div>

            <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Information We Collect</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-semibold">Business profile data:</span> name, address, category, description, contact information, and operating hours.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-semibold">Assets:</span> uploaded logos, menu images, and other media used to display your listing.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-semibold">Location Data:</span> coordinates entered through the map picker to help customers find your business.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-semibold">Authentication metadata:</span> account creation and login details.
                </li>
              </ul>
            </section>

            <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">How We Use Your Data</h3>
              <p className="text-slate-700 leading-7">
                We use business data to build your menu profile, power the MenuQR management experience, and help customers discover and contact your business.
              </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Storage & Security</h3>
                <p className="text-slate-700 leading-7">
                  Business data is stored securely in Supabase with standard security measures and restricted access.
                </p>
              </section>
              <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Sharing & Third Parties</h3>
                <p className="text-slate-700 leading-7">
                  We do not sell your business information. We only share data with trusted service providers required to operate MenuQR.
                </p>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Retention</h3>
                <p className="text-slate-700 leading-7">
                  We retain business profile data while your account exists or as required by law. You can request deletion at any time.
                </p>
              </section>
              <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Your Rights</h3>
                <p className="text-slate-700 leading-7">
                  You may access, correct, or delete your business data, and ask us to update any inaccurate information.
                </p>
              </section>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Contact</h3>
              <p className="text-slate-700 leading-7">
                For privacy questions or requests, contact the MenuQR team at
                <a href="mailto:projectmenuqr@gmail.com" className="font-semibold text-[#E23838] underline">projectmenuqr@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    )}
  </>
  );
}