"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  // helper to look up role from users table
  const getRole = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data?.role;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const role = await getRole(data.user.id);
    if (role === "owner") {
      // take owner to business landing; dashboard will be accessible once session is ready
      router.push("/business");
    } else {
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF4] px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full grid md:grid-cols-2">
        {/* left logo/text */}
        <div className="bg-white p-12 flex flex-col items-center justify-center">
          <Image
            src="/hero-icon.png"
            alt="MenuQR Logo"
            width={300}
            height={240}
            className="mb-8"
          />
          <h3 className="text-5xl font-bold text-[#111] mb-3 text-center">MenuQR</h3>
          <p className="text-2xl text-[#333] text-center font-semibold">Save Your Favorites!</p>
        </div>

        {/* right login form */}
        <div className="bg-[#E23838] p-12 flex flex-col justify-center">
          <h2 className="text-center text-3xl font-bold text-white mb-2">
            Log in to your account
          </h2>
          <p className="text-center text-white/90 text-sm mb-8">
            Enter your credentials below to access your dashboard.
          </p>

          {errorMessage && (
            <div className="bg-red-200 text-red-800 p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          <form className="flex flex-col gap-4 mb-6 bg-white rounded-2xl p-6" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 rounded-lg p-4 text-[#333] placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 rounded-lg p-4 text-[#333] placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <button
              type="submit"
              className="bg-[#F2FF00] text-[#E23838] font-bold py-3 rounded-lg hover:bg-yellow-200 transition-all shadow-md hover:shadow-lg"
            >
              Log in
            </button>
          </form>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-[#333] font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.70 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.30-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
