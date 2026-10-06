import { supabase } from "@/lib/supabaseClient";

export type ReorderKind = "categories" | "menu-items" | "option-groups" | "option-choices";

export async function saveDisplayOrder(kind: ReorderKind, ids: string[], parentId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch("/api/business/reorder", {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify({ kind, ids, parentId }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Failed to save display order.");
  }
}