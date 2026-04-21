"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DynamicGreeting() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const firstName = user?.user_metadata?.first_name || "Guest";

  return (
    <h1 className="text-3xl font-bold">
      Welcome, {firstName}!
    </h1>
  );
}
