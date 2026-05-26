const MENU_CACHE_KEY_PREFIX = "menuqr_offline_menu_";

export type OfflineMenuSnapshot = {
  business: any;
  menuItems: any[];
  savedAt: string;
};

export function loadOfflineMenu(slug: string): OfflineMenuSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${MENU_CACHE_KEY_PREFIX}${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineMenuSnapshot;
  } catch (error) {
    console.warn("Failed to read offline menu cache", error);
    return null;
  }
}

export function persistOfflineMenu(slug: string, business: any, menuItems: any[]) {
  if (typeof window === "undefined") return;

  try {
    const payload: OfflineMenuSnapshot = {
      business,
      menuItems,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`${MENU_CACHE_KEY_PREFIX}${slug}`, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist offline menu cache", error);
  }
}
