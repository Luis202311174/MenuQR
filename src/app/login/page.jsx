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
    <div className="min-h-screen flex items-center justify-center bg-[#eef4ff] px-4 py-10">
      <div className="relative max-w-5xl w-full">
        <div className="absolute -left-12 top-10 h-44 w-44 rounded-full bg-[#4f65ff]/20 blur-3xl" />
        <div className="absolute right-8 bottom-10 h-36 w-36 rounded-full bg-[#102A43]/15 blur-3xl" />

        <div className="relative bg-white rounded-[2rem] shadow-[0_35px_100px_rgba(16,42,67,0.12)] overflow-hidden grid md:grid-cols-2">
          <div className="bg-[#eff4ff] p-10 sm:p-14 flex flex-col items-center justify-center gap-8">
            <div className="rounded-full bg-white p-5 shadow-xl">
              <Image
                src="/hero-icon.png"
                alt="MenuQR Logo"
                width={180}
                height={160}
                className="object-contain"
              />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-xs uppercase tracking-[0.4em] font-semibold text-[#4f65ff] mb-3">
                Welcome back
              </p>
              <h3 className="text-4xl font-bold text-[#102A43] mb-3">MenuQR</h3>
              <p className="text-base text-[#42596b] leading-relaxed">
                Sign in to manage your menu, view orders, and stay connected with guests instantly.
              </p>
            </div>
            <div className="grid gap-4 w-full">
              <div className="rounded-3xl border border-[#d8e3f7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#102A43]">Fast access</p>
                <p className="text-sm text-[#556d82] mt-1">Google login for quick and secure entry.</p>
              </div>
              <div className="rounded-3xl border border-[#d8e3f7] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#102A43]">Dashboard ready</p>
                <p className="text-sm text-[#556d82] mt-1">Jump straight into your business and menu controls.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#102A43] p-10 sm:p-14 flex flex-col justify-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-3 text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-[#8fb0ff] font-semibold">
                  Log in
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Log in to your account
                </h2>
                <p className="text-sm text-[#cfd8ff]">
                  Continue with Google to access your dashboard.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-2xl bg-[#ffebe9] p-4 text-sm text-[#92140c]">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-white text-[#102A43] py-4 font-semibold shadow-lg transition hover:bg-slate-100"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.70 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="grid grid-cols-2 gap-3">
                <span className="rounded-2xl border border-white/15 bg-white/10 py-3 text-center text-sm text-[#cfd8ff]">
                  Secure login
                </span>
                <span className="rounded-2xl border border-white/15 bg-white/10 py-3 text-center text-sm text-[#cfd8ff]">
                  One-click access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}