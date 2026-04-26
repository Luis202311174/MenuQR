import { supabase } from "@/lib/supabaseClient";
import { fetchBusinessBySlug } from "./fetchBusinessBySlug";
import { fetchMenuItems } from "./fetchMenuItems";
import { handleTableSession } from "./handleTableSession";

export type BusinessPageLoadResult = {
  business: any | null;
  menuItems: any[];
  sessionId: string | null;
  tableInvalid: boolean;
  notification?: { message: string; type: "success" | "error" };
};

export async function loadBusinessPageData(
  slug: string,
  tableId?: string | null
): Promise<BusinessPageLoadResult> {
  const business = await fetchBusinessBySlug(slug);

  if (!business) {
    return {
      business: null,
      menuItems: [],
      sessionId: null,
      tableInvalid: false,
    };
  }

  business.view_count = business.view_count ?? 0;

  const menuItems = await fetchMenuItems(business.id);

  if (!tableId) {
    return {
      business,
      menuItems,
      sessionId: null,
      tableInvalid: false,
    };
  }

  try {
    const sessionId = await handleTableSession(tableId);

    if (!sessionId) {
      return {
        business,
        menuItems,
        sessionId: null,
        tableInvalid: true,
        notification: {
          message: "Invalid table QR. Scan a valid table QR to unlock ordering.",
          type: "error",
        },
      };
    }

    return {
      business,
      menuItems,
      sessionId,
      tableInvalid: false,
    };
  } catch (error) {
    console.error("Session error:", error);

    return {
      business,
      menuItems,
      sessionId: null,
      tableInvalid: true,
      notification: {
        message: "Could not connect table session. Please scan again.",
        type: "error",
      },
    };
  }
}