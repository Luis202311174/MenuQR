import { supabase } from "@/lib/supabaseClient";
import { fetchBusinessBySlug } from "./fetchBusinessBySlug";
import { fetchMenuItems } from "./fetchMenuItems";
import { handleTableSession } from "./handleTableSession";
import { redisGet, redisSet } from "@/lib/redis";

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
  const cacheKey = `business_page:${slug}`;
  try {
    const cached = await redisGet(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Return cached result but still verify session handling below
        const { business: cachedBusiness, menuItems: cachedMenuItems } = parsed;
        // Fetch session only when tableId exists
        if (!tableId) {
          return {
            business: cachedBusiness,
            menuItems: cachedMenuItems,
            sessionId: null,
            tableInvalid: false,
          };
        }
        // If tableId present, continue to fetch session and return cached business/menu
        const sessionId = await handleTableSession(tableId);
        if (!sessionId) {
          return {
            business: cachedBusiness,
            menuItems: cachedMenuItems,
            sessionId: null,
            tableInvalid: true,
            notification: {
              message: "Invalid table QR. Scan a valid table QR to unlock ordering.",
              type: "error",
            },
          };
        }

        return {
          business: cachedBusiness,
          menuItems: cachedMenuItems,
          sessionId,
          tableInvalid: false,
          notification: {
            message: "Table connected",
            type: "success",
          },
        };
      } catch {
        // fallthrough to refetch if cache parse failed
      }
    }
  } catch (e) {
    // ignore cache errors and proceed to fetch
    console.warn('Redis get failed:', e?.message || e);
  }

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

  // Cache the business + menu for a short period (TTL 60s)
  try {
    const payload = JSON.stringify({ business, menuItems });
    await redisSet(cacheKey, payload, 60);
  } catch (e) {
    // ignore cache set failures
    console.warn('Redis set failed:', e?.message || e);
  }

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
      notification: {
        message: "Table connected",
        type: "success",
      },
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