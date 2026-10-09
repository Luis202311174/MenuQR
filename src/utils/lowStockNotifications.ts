export interface LowStockNotification {
  id: string;
  name: string;
  current_stock: number;
  daily_limit?: number | null;
  timestamp: string;
  category?: string;
}

const STORAGE_KEY = "lowStockNotifications";
const ACKNOWLEDGED_STORAGE_KEY = "acknowledgedLowStockItems";

export function getStoredLowStockNotifications(): LowStockNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function storeLowStockNotification(notification: LowStockNotification) {
  if (typeof window === "undefined") return;

  const notifications = getStoredLowStockNotifications();
  const existingIndex = notifications.findIndex((item) => item.id === notification.id);

  if (existingIndex !== -1) {
    notifications[existingIndex] = {
      ...notifications[existingIndex],
      name: notification.name,
      current_stock: notification.current_stock,
      daily_limit: notification.daily_limit ?? notifications[existingIndex].daily_limit,
      timestamp: notification.timestamp,
      category: notification.category ?? notifications[existingIndex].category,
    };
  } else {
    notifications.push(notification);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchLowStockNotificationsUpdated();
}

export function getAcknowledgedLowStockItemIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function acknowledgeLowStockItems(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;

  const acknowledgedIds = new Set(getAcknowledgedLowStockItemIds());
  ids.forEach((id) => acknowledgedIds.add(id));
  localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify([...acknowledgedIds]));
}

export function removeLowStockAcknowledgements(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;

  const idsToRemove = new Set(ids);
  const remainingIds = getAcknowledgedLowStockItemIds().filter((id) => !idsToRemove.has(id));
  localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(remainingIds));
}

export function clearStoredLowStockNotifications() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  dispatchLowStockNotificationsUpdated();
}

export function removeLowStockNotification(id: string) {
  if (typeof window === "undefined") return;
  const notifications = getStoredLowStockNotifications().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchLowStockNotificationsUpdated();
}

export function dispatchLowStockNotificationsUpdated() {
  if (typeof window === "undefined") return;

  setTimeout(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("lowStockNotificationsUpdated"));
  }, 0);
}
