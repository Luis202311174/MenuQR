// src/utils/loadBusinessPageData.ts
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

const API_BASE = "/api/business";

async function callServerApi(slug: string, tableId?: string | null) {
  const encoded = encodeURIComponent(slug);
  const qs = tableId ? `?table=${encodeURIComponent(tableId)}` : "";
  const url = `${API_BASE}/${encoded}${qs}`;

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => null);
    throw new Error(`API ${url} failed: ${res.status} ${bodyText ?? ""}`);
  }
  return (await res.json()) as BusinessPageLoadResult;
}

/**
 * Client-side loader for business page data.
 * Primary path: request server API which handles Redis/ioredis (server-only).
 * Fallback path: if the API call fails (network or server), fetch directly via client-safe utilities.
 */
export async function loadBusinessPageData(
  slug: string,
  tableId?: string | null
): Promise<BusinessPageLoadResult> {
  // 1) Try the server API first (preferred: server may return cached payload)
  try {
    const serverPayload = await callServerApi(slug, tableId);
    // Normalize shape defensively
    return {
      business: serverPayload.business ?? null,
      menuItems: Array.isArray(serverPayload.menuItems) ? serverPayload.menuItems : [],
      sessionId: serverPayload.sessionId ?? null,
      tableInvalid: Boolean(serverPayload.tableInvalid),
      notification: serverPayload.notification,
    };
  } catch (apiErr) {
    // API failed (could be offline or server error). Fall through to client-side fetch.
    // Keep a console warning for debugging.
    // eslint-disable-next-line no-console
    console.warn("Server API load failed, falling back to client fetch:", apiErr);
  }

  // 2) Fallback: fetch directly from Supabase via client-safe helpers
  try {
    const business = await fetchBusinessBySlug(slug);

    if (!business) {
      return {
        business: null,
        menuItems: [],
        sessionId: null,
        tableInvalid: false,
      };
    }

    const menuItems = await fetchMenuItems(business.id);

    // If client requested a table/session, attempt to create/validate it client-side.
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
    } catch (sessionErr) {
      console.warn("Table session handling failed in fallback:", sessionErr);
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
  } catch (err) {
    // Final fallback: network/offline — caller can try offline cache
    // eslint-disable-next-line no-console
    console.warn("Client fetch fallback failed:", err);
    return {
      business: null,
      menuItems: [],
      sessionId: null,
      tableInvalid: false,
    };
  }
}