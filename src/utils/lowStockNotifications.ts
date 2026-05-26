export interface LowStockNotification {
  id: string;
  name: string;
  current_stock: number;
  timestamp: string;
}

const STORAGE_KEY = "lowStockNotifications";

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
      current_stock: notification.current_stock,
      timestamp: notification.timestamp,
    };
  } else {
    notifications.push(notification);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchLowStockNotificationsUpdated();
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
