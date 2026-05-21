"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!response.ok) {
        const text = await response.text();
        setErrorMessage(text || "Unable to sign in");
        return;
      }

      const result = await response.json();
      router.push(result.redirect || "/business/dashboard");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4ff] px-4 py-10 flex items-center justify-center">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_35px_100px_rgba(16,42,67,0.12)] md:grid md:grid-cols-2">
        <div className="relative bg-[#eff4ff] p-10 sm:p-14 flex flex-col items-center justify-center gap-8">
          <div className="rounded-full bg-white p-5 shadow-xl">
            <img src="/hero-icon.png" alt="MenuQR Logo" className="w-36 h-32 object-contain" />
          </div>
          <div className="text-center max-w-xs">
            <p className="text-xs uppercase tracking-[0.4em] font-semibold text-[#4f65ff] mb-3">Staff login</p>
            <h3 className="text-4xl font-bold text-[#102A43] mb-3">Welcome back</h3>
            <p className="text-base text-[#42596b] leading-relaxed">
              Use your staff email and password to access only the sections your role allows.
            </p>
          </div>
          <div className="grid gap-4 w-full">
            <div className="rounded-3xl border border-[#d8e3f7] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#102A43]">Remember me</p>
              <p className="text-sm text-[#556d82] mt-1">Keep this session active for easy staff access.</p>
            </div>
            <div className="rounded-3xl border border-[#d8e3f7] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#102A43]">Separate staff portal</p>
              <p className="text-sm text-[#556d82] mt-1">This login is only for staff accounts, not owner or customer accounts.</p>
            </div>
          </div>
        </div>

        <div className="p-10 sm:p-14 bg-[#102A43] text-white flex flex-col justify-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-[#8fb0ff] font-semibold">Staff sign in</p>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Sign in to your staff dashboard</h2>
              <p className="text-sm text-[#cfd8ff]">Secure email login for cashiers, waiters, kitchen staff, and inventory staff.</p>
            </div>

            {errorMessage && (
              <div className="rounded-2xl bg-[#ffebe9] p-4 text-sm text-[#92140c]">
                {errorMessage}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-white/90">
                Email address
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="mt-2 w-full rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-white/60 focus:bg-white/15"
                  placeholder="staff@example.com"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90">
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="mt-2 w-full rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-white/60 focus:bg-white/15"
                  placeholder="Enter password"
                />
              </label>
              <div className="flex items-center justify-between gap-4 text-sm text-[#cfd8ff]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-[#4f65ff] focus:ring-[#4f65ff]"
                  />
                  Remember me
                </label>
                <Link href="/staff/forgot-password" className="font-semibold text-white hover:text-[#dce8ff]">
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-white px-6 py-4 text-[#102A43] font-semibold shadow-lg transition hover:bg-slate-100"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-2xl border border-white/15 bg-white/10 py-3 text-center text-[#cfd8ff]">Secure email</span>
              <span className="rounded-2xl border border-white/15 bg-white/10 py-3 text-center text-[#cfd8ff]">Modern staff access</span>
            </div>

            <div className="text-sm text-[#cfd8ff] text-center">
              <p>Need owner access instead?</p>
              <Link href="/login" className="font-semibold text-white hover:text-[#dce8ff]">
                Login as owner
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
