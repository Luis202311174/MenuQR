"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupUserPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
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
      } else {
        router.push("/signup-auth");
      }

      setAuthLoading(false);
    };

    loadCurrentUser();
  }, [router]);

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
      return alert("Contact number must start with +639 and be followed by 9 digits.");
    }

    try {
      if (!currentUser) throw new Error("User not authenticated");

      const userId = currentUser.id;

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

        if (error) throw error;
      }

      router.push("/");

    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // allow non-auth flow for static mode if needed
  // if (!tempUser && !currentUser) return null;
  if (authLoading) return null;
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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
                <div className="relative max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                        Privacy Policy
                      </p>
                      <h2 className="text-3xl font-bold text-slate-900">MenuQR User Privacy</h2>
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
                        MenuQR protects your privacy in accordance with Republic Act No. 10173 (Data Privacy Act of 2012). This policy describes the personal information we collect, why we collect it, and how we keep it secure.
                      </p>
                    </div>

                    <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3">Information We Collect</h3>
                      <ul className="space-y-3 text-slate-700">
                        <li className="rounded-2xl bg-slate-50 p-4">
                          <span className="font-semibold">Account Data:</span> name, email address, and authentication details managed securely by Supabase Auth.
                        </li>
                        <li className="rounded-2xl bg-slate-50 p-4">
                          <span className="font-semibold">Profile Data:</span> age, contact number, and address details used to personalize your MenuQR experience.
                        </li>
                        <li className="rounded-2xl bg-slate-50 p-4">
                          <span className="font-semibold">Usage Data:</span> preferences, saved menus, and interactions that support app functionality.
                        </li>
                        <li className="rounded-2xl bg-slate-50 p-4">
                          <span className="font-semibold">Technical Data:</span> device information, IP address, and browser data used for security and performance.
                        </li>
                      </ul>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3">How We Use Your Data</h3>
                      <p className="text-slate-700 leading-7">
                        We use your information to create and manage your account, deliver MenuQR services, remember your preferences, and improve the app experience.
                        Your data helps power saved menus, personalized suggestions, and secure user access.
                      </p>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Data Storage & Security</h3>
                        <p className="text-slate-700 leading-7">
                          Your information is stored securely in Supabase with industry-standard safeguards. Passwords are never stored in plain text.
                        </p>
                      </section>
                      <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Sharing & Third Parties</h3>
                        <p className="text-slate-700 leading-7">
                          We do not sell your data. We only share information with trusted service providers required to operate MenuQR, such as Supabase.
                        </p>
                      </section>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Retention</h3>
                        <p className="text-slate-700 leading-7">
                          We keep your account data while your account is active or as required by law. You can request deletion of your account at any time.
                        </p>
                      </section>
                      <section className="rounded-[28px] border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Your Rights</h3>
                        <p className="text-slate-700 leading-7">
                          You may access, correct, or delete your personal information. You can also ask us to stop processing data that is no longer needed for the service.
                        </p>
                      </section>
                    </div>

                    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3">Contact</h3>
                      <p className="text-slate-700 leading-7">
                        If you have any privacy questions or requests, email the MenuQR team at
                        <a href="mailto:projectmenuqr@gmail.com" className="font-semibold text-[#E23838] underline">projectmenuqr@gmail.com</a>.
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}