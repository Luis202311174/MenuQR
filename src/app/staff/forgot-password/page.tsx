"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/staff/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();
      setMessage(payload?.message || "Check your email for reset instructions.");
    } catch (err) {
      console.error(err);
      setError("Unable to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4ff] px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-10 shadow-[0_35px_100px_rgba(16,42,67,0.12)]">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] font-semibold text-[#4f65ff] mb-2">Forgot password</p>
          <h1 className="text-3xl font-bold text-slate-900">Reset your staff password</h1>
          <p className="mt-3 text-sm text-slate-600">
            Enter the email address for your staff account and we will send a reset link.
          </p>
        </div>

        {message && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div>}
        {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Staff email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="staff@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#4f65ff] px-6 py-3 text-white font-semibold shadow-sm transition hover:bg-[#3d52d1]"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => router.push("/staff/login")}
            className="font-semibold text-[#4f65ff] hover:text-[#3d52d1]"
          >
            Back to staff login
          </button>
        </div>
      </div>
    </div>
  );
}
