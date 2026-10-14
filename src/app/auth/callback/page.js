"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  const callbackStarted = useRef(false);

  useEffect(() => {
    if (callbackStarted.current) return;
    callbackStarted.current = true;

    const finishSignup = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const businessData = JSON.parse(
          localStorage.getItem("businessSignup") || "null"
        );

        // BUSINESS SIGNUP FLOW
        if (businessData) {
          const { error: userInsertError } = await supabase.from("users").insert({
            id: user.id,
            role: "owner",
          });
          if (userInsertError) throw userInsertError;

          const { error: businessInsertError } = await supabase.from("businesses").insert({
            owner_id: user.id,
            name: businessData.business_name,
            description: businessData.description,
            address: businessData.address,
            contact_info: businessData.contact_number,
            slug: businessData.slug,
          });
          if (businessInsertError) throw businessInsertError;

          localStorage.removeItem("businessSignup");
          router.push("/business/dashboard");
          return;
        }

        // CHECK FOR SIGNUP ROLE (from OAuth signup)
        const signupRole = localStorage.getItem("signupRole");
        if (signupRole) {
          localStorage.removeItem("signupRole");
          if (signupRole === "owner") {
            router.push("/signup-owner");
            return;
          } else if (signupRole === "user") {
            router.push("/signup-user");
            return;
          }
        }

        // NORMAL LOGIN FLOW
        const { data: roleRes, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (roleError) throw roleError;

        // FAILSAFE: account has no data in the users table (new account)
        // Do NOT add it to the database. Sign out and return to login
        // so the user can sign up or choose an account with existing data.
        if (!roleRes) {
          await supabase.auth.signOut();
          router.push("/login?new_account=1");
          return;
        }

        if (roleRes.role === "owner") {
          router.push("/business/dashboard");
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Unable to complete authentication callback:", error);
        router.push("/login?auth_error=callback");
      }
    };

    void finishSignup();
  }, [router]);

  return (
    <p className="p-10 text-center text-lg">
      Setting up your account...
    </p>
  );
}