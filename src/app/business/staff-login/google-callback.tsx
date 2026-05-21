"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isValidStaffStatus } from "@/lib/staffPermissions";
import { useRouter } from "next/navigation";

export default function StaffGoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const finishStaffGoogleLogin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/business/staff-login?error=auth");
        return;
      }

      // Check if user is in staff_accounts and active
      const { data: staff, error } = await supabase
        .from("staff_accounts")
        .select("id, status")
        .eq("email", user.email)
        .single();

      if (!staff || !isValidStaffStatus(staff.status)) {
        // Not a staff or not active, sign out and redirect
        await supabase.auth.signOut();
        router.push("/business/staff-login?error=not_staff");
        return;
      }

      // Optionally, set a session cookie or do any other setup here
      router.push("/business/staff-dashboard");
    };

    finishStaffGoogleLogin();
  }, [router]);

  return (
    <p className="p-10 text-center text-lg">
      Verifying staff account...
    </p>
  );
}
