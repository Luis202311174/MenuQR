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

    if (!firstName.trim() || !lastName.trim() || !age.trim() || !contactNumber.trim() || !houseNumber.trim() || !street.trim() || !barangay.trim() || !municipality.trim() || !country.trim()) {
      setLoading(false);
      return alert("Please complete all fields including address components and contact number.");
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
        userId = authData.user.id;
      }

      // Google OAuth signup
      if (currentUser) userId = currentUser.id;

      if (!userId) {
        throw new Error("No authenticated user found. Please sign up or log in first.");
      }

      // Insert into users table
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

  // allow non-auth flow for static mode if needed
  // if (!tempUser && !currentUser) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF4] px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full grid md:grid-cols-2">
        {/* left side: logo and welcoming tagline */}
        <div className="bg-white p-12 flex flex-col items-center justify-center">
          {/* using next/image avoids layout shift */}
          <img src="/hero-icon.png" alt="MenuQR Logo" width={300} height={240} className="mb-8" />
          <h3 className="text-4xl font-bold text-[#111] mb-3 text-center">
            Welcome to MenuQR
          </h3>
          <p className="text-2xl text-[#333] text-center font-semibold">
            Discover favorites and save menus with ease!
          </p>
        </div>

        {/* right side: registration form */}
        <div className="bg-[#E23838] p-8 md:p-12 flex flex-col justify-center">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-white">
            Register as Food Lover
          </h1>

          <form className="space-y-6 mb-6 bg-white rounded-2xl p-6 shadow-lg" onSubmit={handleSubmit}>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Fill out form for Food Lover</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={new Date().toISOString().split("T")[0]}
                    readOnly
                    className="w-full border border-gray-300 rounded-md p-3 bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value="Food Lover"
                    readOnly
                    className="w-full border border-gray-300 rounded-md p-3 bg-gray-100"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Age</label>
                  <input
                    type="number"
                    min="1"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="+639171234567"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    pattern="^\+639\d{9}$"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-3 bg-gray-100"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Address details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">House #</label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Street</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Barangay</label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Municipality</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
            </section>

          <label className="flex items-center gap-2">            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="form-checkbox"
            />
            <span className="text-sm">
              I agree to the <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline text-blue-600"
              >privacy policy</button>.
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
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>

        </form>
      </div>

      {/* privacy policy modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg relative">
            <button
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 text-2xl font-bold"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
            <p className="mb-2">
              MenuQR is committed to protecting your privacy in accordance with
              Republic Act No. 10173, also known as the Data Privacy Act of 2012
              (DPA). This policy explains how we collect and process your
              personal information during registration and use of our web
              application.
            </p>
            <h3 className="font-semibold mt-4">Information We Collect</h3>
            <p>
              We collect information you voluntarily provide during
              registration:
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong>Account Data:</strong> Name, email address, and password
                (managed securely via Supabase Auth).
              </li>
              <li>
                <strong>Usage Data:</strong> Your history of visited menus,
                "hearted" (favorite) restaurants, and app interactions.
              </li>
              <li>
                <strong>Technical Data:</strong> IP address and device type for
                security and diagnostic purposes.
              </li>
            </ul>
            <h3 className="font-semibold mt-4">Purpose of Collection</h3>
            <p>
              We process your data for the following legitimate purposes:
            </p>
            <ul className="list-disc pl-5">
              <li>
                To create and maintain your personalized MenuQR account.
              </li>
              <li>
                To provide features like your History of Visit and
                Saved/Favorite Menus.
              </li>
              <li>
                To generate Smart Suggestions based on trending or most-visited
                menus.
              </li>
              <li>
                To send essential service-related updates (e.g., password
                resets).
              </li>
            </ul>
            <h3 className="font-semibold mt-4">Data Storage and Security</h3>
            <p>
              Your data is stored using Supabase (PostgreSQL database) which
              employs industry-standard encryption and access controls. We do
              not store plain-text passwords.
            </p>
            <h3 className="font-semibold mt-4">Your Rights as a Data Subject</h3>
            <p>Under the DPA, you have the following rights:</p>
            <ul className="list-disc pl-5">
              <li>Right to be Informed: To know how your data is being processed.</li>
              <li>Right to Access: To request a copy of the data we hold about you.</li>
              <li>Right to Rectification: To correct any inaccuracies in your personal information.</li>
              <li>Right to Erasure/Blocking: To request the deletion of your account and associated data.</li>
            </ul>
            <h3 className="font-semibold mt-4">Third-Party Sharing</h3>
            <p>
              We do not sell your personal data. We only share information with
              our infrastructure provider (Supabase) to host our services.
            </p>
            <h3 className="font-semibold mt-4">Contact Us</h3>
            <p>
              For any privacy concerns or to exercise your rights, please
              contact our Data Protection Officer at:
            </p>
            <p>
              Email: [Your Team/Project Email]<br />
              Team: WebWorks – Gordon College
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
