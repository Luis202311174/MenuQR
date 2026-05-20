"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasStaffPermission, type StaffModuleKey, type StaffSessionData } from "@/lib/staffPermissions";

interface BusinessAuthState {
  checked: boolean;
  owner: boolean;
  staffSession: StaffSessionData | null;
}

export function useBusinessAuth(
  requiredModule?: StaffModuleKey,
  requiredAction: "view" | "access" = "view"
) {
  const router = useRouter();
  const [authState, setAuthState] = useState<BusinessAuthState>({
    checked: false,
    owner: false,
    staffSession: null,
  });

  useEffect(() => {
    let canceled = false;

    const resolveAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        const { data: user } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (user?.role === "owner") {
          if (!canceled) {
            setAuthState({ checked: true, owner: true, staffSession: null });
          }
          return;
        }
      }

      try {
        const response = await fetch("/api/staff/session", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const staffSession = (await response.json()) as StaffSessionData;
          if (!canceled) {
            setAuthState({ checked: true, owner: false, staffSession });
          }
          return;
        }
      } catch (error) {
        console.error("Failed to resolve staff session:", error);
      }

      if (!canceled) {
        setAuthState({ checked: true, owner: false, staffSession: null });
      }
    };

    resolveAuth();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!authState.checked) return;

    if (!authState.owner && !authState.staffSession) {
      router.push("/login");
      return;
    }

    if (
      authState.staffSession &&
      requiredModule &&
      !hasStaffPermission(authState.staffSession, requiredModule, requiredAction)
    ) {
      router.push("/business/access-denied");
    }
  }, [authState, requiredModule, requiredAction, router]);

  return authState;
}
