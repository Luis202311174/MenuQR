export type AppNotificationType =
  | "inventory"
  | "receipt"
  | "order"
  | "payment"
  | "general";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  href: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = "appNotifications";

export function getStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function storeNotification(notification: AppNotification) {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications();
  const index = notifications.findIndex((item) => item.id === notification.id);

  if (index !== -1) {
    notifications[index] = { ...notifications[index], ...notification };
  } else {
    notifications.push(notification);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchNotificationsUpdated();
}

export function removeNotification(id: string) {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchNotificationsUpdated();
}

export function clearStoredNotifications() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  dispatchNotificationsUpdated();
}

export function dispatchNotificationsUpdated() {
  if (typeof window === "undefined") return;

  setTimeout(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  }, 0);
}
