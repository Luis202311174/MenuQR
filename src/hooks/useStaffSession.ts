"use client";

import { useEffect, useState } from "react";
import type { StaffSessionData } from "@/lib/staffPermissions";
import {
  loadStaffSession,
  subscribeToStaffSessionInvalidation,
} from "@/utils/staffSessionClient";

export function useStaffSession(enabled: boolean = true) {
  const [staffSession, setStaffSession] = useState<StaffSessionData | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSession = async (forceRefresh = false) => {
      try {
        const data = await loadStaffSession({ forceRefresh });
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

    void loadSession();
    const unsubscribe = subscribeToStaffSessionInvalidation(() => {
      void loadSession();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled]);

  return { staffSession, loading };
}

export function useIsStaffLoggedIn() {
  const { staffSession, loading } = useStaffSession();
  return { isLoggedIn: !!staffSession, loading };
}