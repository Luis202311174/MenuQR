"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StaffPermissionAction } from "@/lib/staffPermissions";
import { hasStaffPermission, type StaffModuleKey, type StaffSessionData } from "@/lib/staffPermissions";

interface BusinessAuthState {
  checked: boolean;
  owner: boolean;
  staffSession: StaffSessionData | null;
  businessId: string | null;
}

export function useBusinessAuth(
  requiredModule?: StaffModuleKey,
  requiredAction: StaffPermissionAction = "view"
) {
  const router = useRouter();
  const [authState, setAuthState] = useState<BusinessAuthState>({
    checked: false,
    owner: false,
    staffSession: null,
    businessId: null,
  });

  useEffect(() => {
    let canceled = false;

    const resolveAuth = async () => {
      try {
        const response = await fetch("/api/staff/session", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const staffSession = (await response.json()) as StaffSessionData;

          if (!canceled) {
            setAuthState({
              checked: true,
              owner: false,
              staffSession,
              businessId: staffSession.businessId,
            });
          }
          return;
        }
      } catch (error) {
        console.error("Failed to resolve staff session:", error);
      }

      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (session?.user) {
          const { data: user } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (user?.role === "owner") {
            // Fetch the business ID for this owner
            const { data: business } = await supabase
              .from("businesses")
              .select("id")
              .eq("owner_id", session.user.id)
              .single();

            if (!canceled) {
              setAuthState({
                checked: true,
                owner: true,
                staffSession: null,
                businessId: business?.id || null,
              });
            }
            return;
          }
        }
      } catch (error) {
        console.error("Owner auth session failed:", error);
      }

      if (!canceled) {
        setAuthState({
          checked: true,
          owner: false,
          staffSession: null,
          businessId: null,
        });
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
      // 🟢 Pass requiredAction as the third parameter here:
      !hasStaffPermission(authState.staffSession, requiredModule, requiredAction)
    ) {
      router.push("/business/access-denied");
      return;
    }
  }, [authState, requiredModule, requiredAction, router]);

  return authState;
}
