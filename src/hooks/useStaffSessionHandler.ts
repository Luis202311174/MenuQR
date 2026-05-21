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

export function useStaffSessionHandler(
  requiredModule?: StaffModuleKey,
  requiredAction: StaffPermissionAction = "view",
  isOwner: boolean = false
): StaffSessionHandlerResult {
  const router = useRouter();
  
  // ✅ Only load staff session if NOT an owner
  const { staffSession, loading } = useStaffSession(!isOwner);

  const [redirected, setRedirected] = useState(false);

  const businessId = useMemo(() => {
    if (isOwner) return null;
    return staffSession?.businessId ?? null;
  }, [staffSession, isOwner]);

  useEffect(() => {
    if (isOwner) return; // 🔥 OWNER ESCAPE HATCH

    if (redirected) return;
    if (loading) return;

    if (!staffSession) {
      setRedirected(true);
      router.replace("/business/staff-login");
      return;
    }

    if (requiredModule) {
      const permitted = hasStaffPermission(staffSession, requiredModule, requiredAction);
      if (!permitted) {
        setRedirected(true);
        router.replace("/business/access-denied");
      }
    }
  }, [loading, staffSession, redirected, requiredModule, requiredAction, router, isOwner]);

  return {
    staffSession,
    businessId,
    loading: isOwner ? false : loading,
  };
}