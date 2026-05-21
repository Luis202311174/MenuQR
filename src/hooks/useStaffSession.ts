"use client";

import { useEffect, useState } from "react";
import type { StaffSessionData } from "@/lib/staffPermissions";

export function useStaffSession() {
  const [staffSession, setStaffSession] = useState<StaffSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/staff/session", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setStaffSession(null);
          return;
        }

        const data = (await response.json()) as StaffSessionData;
        if (!cancelled) {
          setStaffSession(data);
        }
      } catch (error) {
        console.error("Unable to load staff session:", error);
        if (!cancelled) {
          setStaffSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return { staffSession, loading };
}

// Optionally, add a helper to check if staff is logged in
export function useIsStaffLoggedIn() {
  const { staffSession, loading } = useStaffSession();
  return { isLoggedIn: !!staffSession, loading };
}
