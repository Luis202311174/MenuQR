import { supabase } from "@/lib/supabaseClient";

export async function trackBusinessViewOnce(businessId: string) {
  if (typeof window === "undefined") return;

  const key = `viewed_business_${businessId}`;
  const lastViewed = localStorage.getItem(key);

  const now = Date.now();
  const cooldown = 60 * 1000;

  if (lastViewed && now - Number(lastViewed) < cooldown) return;

  localStorage.setItem(key, now.toString());

  // If offline, skip the RPC silently and keep the local marker
  if (typeof window !== "undefined" && !navigator.onLine) return;

  try {
    const { error } = await supabase.rpc("increment_business_view", {
      bid: businessId,
    });

    if (error) {
      throw error;
    }
  } catch (e: any) {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return;
    }

    console.error(
      "trackBusinessViewOnce RPC failed:",
      e instanceof Error ? e.message : e,
      { businessId }
    );
    localStorage.removeItem(key);
  }
}