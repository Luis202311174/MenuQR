"use client";

import { supabase } from "@/lib/supabaseClient";
import type { StaffSessionData } from "@/lib/staffPermissions";

const SESSION_CACHE_MS = 15_000;

let cachedSession: StaffSessionData | null | undefined;
let cacheExpiresAt = 0;
let sessionRequest: Promise<StaffSessionData | null> | null = null;
let requestVersion = 0;
let authListenerInitialized = false;
const invalidationListeners = new Set<() => void>();

function initializeAuthListener() {
  if (authListenerInitialized || typeof window === "undefined") return;
  authListenerInitialized = true;

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      invalidateStaffSessionCache();
    }
  });
}

export function subscribeToStaffSessionInvalidation(listener: () => void) {
  invalidationListeners.add(listener);
  return () => invalidationListeners.delete(listener);
}

export function invalidateStaffSessionCache() {
  requestVersion += 1;
  cachedSession = undefined;
  cacheExpiresAt = 0;
  sessionRequest = null;
  invalidationListeners.forEach((listener) => listener());
}

export async function loadStaffSession(
  options: { forceRefresh?: boolean } = {},
): Promise<StaffSessionData | null> {
  initializeAuthListener();

  if (options.forceRefresh) {
    cachedSession = undefined;
    cacheExpiresAt = 0;
    sessionRequest = null;
    requestVersion += 1;
  }

  if (cachedSession !== undefined && Date.now() < cacheExpiresAt) {
    return cachedSession;
  }

  if (sessionRequest) return sessionRequest;

  const version = requestVersion;
  const request = (async () => {
    const response = await fetch("/api/staff/session", {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 401) return null;
    if (!response.ok) {
      throw new Error(`Unable to load staff session (${response.status}).`);
    }

    return (await response.json()) as StaffSessionData;
  })();

  sessionRequest = request;

  try {
    const staffSession = await request;
    if (requestVersion !== version) {
      return loadStaffSession();
    }

    cachedSession = staffSession;
    cacheExpiresAt = Date.now() + SESSION_CACHE_MS;
    return staffSession;
  } finally {
    if (sessionRequest === request) {
      sessionRequest = null;
    }
  }
}
