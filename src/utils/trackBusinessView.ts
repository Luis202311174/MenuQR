import { supabase } from "@/lib/supabaseClient";

export async function trackBusinessViewOnce(businessId: string) {
  if (typeof window === "undefined") return;

  const key = `viewed_business_${businessId}`;
  const lastViewed = localStorage.getItem(key);

  const now = Date.now();
  const cooldown = 60 * 1000;

  if (lastViewed && now - Number(lastViewed) < cooldown) return;

  localStorage.setItem(key, now.toString());

  const { error } = await supabase.rpc("increment_business_view", {
    bid: businessId,
  });

  if (error) {
    console.error("RPC failed:", error.message);
    localStorage.removeItem(key);
  }
}