"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      if (!data.session?.access_token) {
        throw new Error("Sign-in succeeded without a valid session. Please try again.");
      }

      const response = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        await supabase.auth.signOut();
        throw new Error(result.error ?? "This account does not have platform-admin access.");
      }

      router.replace("/admin");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-lg flex-col justify-center px-4 py-10 text-slate-900">
      <h1 className="text-2xl font-bold">Platform administrator sign-in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in with the email and password for an account granted access in the MenuQR database.
      </p>
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={(event) => void signIn(event)} className="mt-6 space-y-4">
        <label htmlFor="admin-email" className="block text-sm font-medium">
          Email
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label htmlFor="admin-password" className="block text-sm font-medium">
          Password
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <a href="/login" className="mt-4 text-sm text-blue-700 underline">Go to regular MenuQR login</a>
    </main>
  );
}
