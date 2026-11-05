"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying platform-admin access…");

  useEffect(() => {
    let cancelled = false;
    async function verifyAdmin() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) {
        if (!cancelled) setMessage("Sign-in did not complete. Return to the admin sign-in page and try again.");
        return;
      }

      try {
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const result = await response.json();
          if (!cancelled) {
            setMessage(result.error ?? "This account does not have platform-admin access.");
          }
          return;
        }
        router.replace("/admin");
      } catch {
        if (!cancelled) setMessage("Could not verify access. Check your connection and try again.");
      }
    }

    void verifyAdmin();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-lg flex-col justify-center px-4 py-10 text-slate-900">
      <h1 className="text-xl font-semibold">Admin sign-in</h1>
      <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>
      <a href="/admin/login" className="mt-5 text-sm text-blue-700 underline">Back to admin sign-in</a>
    </main>
  );
}
