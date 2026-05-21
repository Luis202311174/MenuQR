"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasStaffPermission, type StaffModuleKey, type StaffSessionData, type StaffPermissionAction } from "@/lib/staffPermissions";
import { useStaffSession } from "@/hooks/useStaffSession";

type StaffSessionHandlerResult = {
  staffSession: StaffSessionData | null;
  businessId: string | null;
  loading: boolean;
};

/**
 * Centralized, guarded staff session handler.
 *
 * Guarantees:
 * - session is loaded before redirects
 * - businessId is derived from a validated session
 * - optional module permission checks
 */
export function useStaffSessionHandler(
  requiredModule?: StaffModuleKey,
  requiredAction: StaffPermissionAction = "view" as StaffPermissionAction
): StaffSessionHandlerResult {
  const router = useRouter();
  const { staffSession, loading } = useStaffSession();

  const [redirected, setRedirected] = useState(false);

  const businessId = useMemo(() => staffSession?.businessId ?? null, [staffSession]);

  useEffect(() => {
    if (redirected) return;
    if (loading) return;

    // Not logged in as staff
    if (!staffSession) {
      setRedirected(true);
      router.replace("/business/staff-login");
      return;
    }

    // Optional permission gating
    if (requiredModule) {
      const permitted = hasStaffPermission(staffSession, requiredModule, requiredAction);
      if (!permitted) {
        setRedirected(true);
        router.replace("/business/access-denied");
      }
    }
  }, [loading, staffSession, redirected, requiredModule, requiredAction, router]);

  return {
    staffSession,
    businessId,
    loading,
  };
}

