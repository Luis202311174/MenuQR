"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState(null);

  const getProfile = async (userId) => {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return data;
  };

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });

    if (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF4] px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full grid md:grid-cols-2">

        {/* left */}
        <div className="bg-white p-12 flex flex-col items-center justify-center">
          <Image
            src="/hero-icon.png"
            alt="MenuQR Logo"
            width={300}
            height={240}
            className="mb-8"
          />
          <h3 className="text-5xl font-bold text-[#111] mb-3 text-center">MenuQR</h3>
          <p className="text-2xl text-[#333] text-center font-semibold">
            Save Your Favorites!
          </p>
        </div>

        {/* right */}
        <div className="bg-[#E23838] p-12 flex flex-col justify-center">

          <h2 className="text-center text-3xl font-bold text-white mb-2">
            Log in to your account
          </h2>

          <p className="text-center text-white/90 text-sm mb-8">
            Continue with Google to access your dashboard.
          </p>

          {errorMessage && (
            <div className="bg-red-200 text-red-800 p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-[#333] font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.70 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

        </div>
      </div>
    </div>
  );
}