"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupUserPage() {
  const router = useRouter();

  const [tempUser, setTempUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [country, setCountry] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
        if (data.user.email) setEmail(data.user.email);
      }
    };

    const sessionData = JSON.parse(sessionStorage.getItem("signupUser"));
    if (sessionData) {
      setTempUser(sessionData);
      if (sessionData.email) setEmail(sessionData.email);
    }

    loadCurrentUser();

    if (!sessionData && !currentUser) {
      router.push("/signup-auth");
    }
  }, [router, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!firstName.trim() || !lastName.trim() || !age.trim() || !contactNumber.trim()) {
      setLoading(false);
      return alert("Please complete all required personal details.");
    }

    const phoneRegex = /^\+639\d{9}$/;
    if (!phoneRegex.test(contactNumber.trim())) {
      setLoading(false);
      return alert("Contact number must start with +639 and be followed by 9 digits (e.g. +639171234567)");
    }

    try {
      let userId = null;

      if (tempUser?.email && tempUser?.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: tempUser.email,
          password: tempUser.password,
        });

        if (authError) throw new Error(authError.message);
        userId = authData.user.id;
      }

      if (currentUser) userId = currentUser.id;

      if (!userId) {
        throw new Error("No authenticated user found. Please sign up or log in first.");
      }

      try {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (!existingUser) {
          const cleanAddress = `${houseNumber}, ${street}, ${barangay}, ${municipality}, ${country}`;
          const { error } = await supabase.from("users").insert([
            {
              id: userId,
              fname: firstName,
              lname: lastName,
              email,
              age: age ? parseInt(age, 10) : null,
              address: cleanAddress,
              phone: contactNumber,
              role: "user",
            },
          ]);

          if (error) {
            console.warn("Supabase user insert failed on static mode", error.message);
          }
        }
      } catch (dbErr) {
        console.warn("Supabase is not available or failed", dbErr?.message || dbErr);
      }

      sessionStorage.removeItem("signupUser");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3ED] px-4 py-10">
      <div className="max-w-[1200px] mx-auto grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
        <div className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.4em] font-semibold text-[#E23838]">Food Lover Signup</p>
            <h1 className="text-4xl font-bold text-slate-900 mt-3">Welcome to MenuQR</h1>
          </div>
          <p className="text-lg text-slate-600 leading-relaxed">
            Join MenuQR to save your favorite menus, discover local restaurants, and get instant access to fresh menu updates.
          </p>
        </div>

        <div className="rounded-[32px] overflow-hidden bg-[#E23838] shadow-sm">
          <div className="bg-[#c22f2f] p-10 text-white">
            <h2 className="text-3xl font-bold">Complete your profile</h2>
            <p className="text-slate-200 mt-3 max-w-xl">
              Fill in your details to finish creating your account and start browsing menus.
            </p>
          </div>

          <div className="bg-white p-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Age</label>
                  <input
                    type="number"
                    min="1"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="+639171234567"
                    value={contactNumber}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, "");
                      if (digits.startsWith("0")) digits = digits.substring(1);
                      if (digits.startsWith("9")) digits = "+63" + digits;
                      else if (digits.startsWith("63")) digits = "+" + digits;
                      else if (!digits.startsWith("+63")) digits = "+63" + digits;
                      setContactNumber(digits);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4 text-slate-900 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">House #</label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Street</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Barangay</label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Municipality</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4 text-slate-900 outline-none focus:border-[#E23838] focus:ring-2 focus:ring-[#F2FF00]/40"
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-[#E23838] focus:ring-[#E23838]"
                />
                <p className="text-sm text-slate-600">
                  I agree to the <button type="button" onClick={() => setShowPrivacy(true)} className="font-semibold text-[#E23838] underline">privacy policy</button>.
                </p>
              </div>

              {!agreePrivacy && (
                <p className="text-sm text-red-600">You must agree to the privacy policy to create an account.</p>
              )}

              <button
                type="submit"
                disabled={loading || !agreePrivacy}
                className="w-full rounded-full bg-[#E23838] px-6 py-4 text-lg font-bold text-[#F2FF00] shadow-md transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>

            {showPrivacy && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
                <div className="max-w-3xl overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl w-full max-h-[90vh]">
                  <button
                    onClick={() => setShowPrivacy(false)}
                    className="absolute right-6 top-6 text-2xl font-bold text-slate-600 hover:text-slate-900"
                  >
                    ×
                  </button>
                  <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
                  <p className="mb-4">
                    MenuQR is committed to protecting your privacy in accordance with Republic Act No. 10173, also known as the Data Privacy Act of 2012 (DPA). This policy explains how we collect and process your personal information during registration and use of our web application.
                  </p>
                  <h3 className="font-semibold mt-4">Information We Collect</h3>
                  <p className="mb-2">
                    We collect information you voluntarily provide during registration:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Account Data:</strong> Name, email address, and password (managed securely via Supabase Auth).</li>
                    <li><strong>Usage Data:</strong> Your history of visited menus, "hearted" (favorite) restaurants, and app interactions.</li>
                    <li><strong>Technical Data:</strong> IP address and device type for security and diagnostic purposes.</li>
                  </ul>
                  <h3 className="font-semibold mt-4">Purpose of Collection</h3>
                  <p className="mb-2">We process your data for the following legitimate purposes:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>To create and maintain your personalized MenuQR account.</li>
                    <li>To provide features like your History of Visit and Saved/Favorite Menus.</li>
                    <li>To generate Smart Suggestions based on trending or most-visited menus.</li>
                    <li>To send essential service-related updates (e.g., password resets).</li>
                  </ul>
                  <h3 className="font-semibold mt-4">Data Storage and Security</h3>
                  <p>
                    Your data is stored using Supabase (PostgreSQL database) which employs industry-standard encryption and access controls. We do not store plain-text passwords.
                  </p>
                  <h3 className="font-semibold mt-4">Your Rights as a Data Subject</h3>
                  <p>Under the DPA, you have the following rights:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Right to be Informed: To know how your data is being processed.</li>
                    <li>Right to Access: To request a copy of the data we hold about you.</li>
                    <li>Right to Rectification: To correct any inaccuracies in your personal information.</li>
                    <li>Right to Erasure/Blocking: To request the deletion of your account and associated data.</li>
                  </ul>
                  <h3 className="font-semibold mt-4">Third-Party Sharing</h3>
                  <p>We do not sell your personal data. We only share information with our infrastructure provider (Supabase) to host our services.</p>
                  <h3 className="font-semibold mt-4">Contact Us</h3>
                  <p>
                    For any privacy concerns or to exercise your rights, please contact our Data Protection Officer at: Email: [Your Team/Project Email] Team: WebWorks – Gordon College
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
