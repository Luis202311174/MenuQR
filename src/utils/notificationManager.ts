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
  // ISO timestamp when the notification was acknowledged/viewed by the user
  acknowledgedAt?: string | null;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = "appNotifications";

export function getStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Normalize older entries to include acknowledgedAt field
    if (Array.isArray(raw)) {
      return raw.map((n) => ({ ...n, acknowledgedAt: n.acknowledgedAt ?? null }));
    }
    return [];
  } catch {
    return [];
  }
}

export function storeNotification(notification: AppNotification) {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications();
  const index = notifications.findIndex((item) => item.id === notification.id);

  if (index !== -1) {
    // Preserve previous acknowledgedAt unless new value provided
    notifications[index] = { ...notifications[index], ...notification, acknowledgedAt: notification.acknowledgedAt ?? notifications[index].acknowledgedAt ?? null };
  } else {
    notifications.push({ ...notification, acknowledgedAt: notification.acknowledgedAt ?? null });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchNotificationsUpdated();
}

export function acknowledgeNotification(id: string) {
  if (typeof window === "undefined") return;
  const notifications = getStoredNotifications();
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return;
  notifications[idx] = { ...notifications[idx], acknowledgedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  dispatchNotificationsUpdated();
}

export function isAcknowledgedToday(notification: AppNotification) {
  if (!notification || !notification.acknowledgedAt) return false;
  try {
    const a = new Date(notification.acknowledgedAt);
    const now = new Date();
    return a.getFullYear() === now.getFullYear() && a.getMonth() === now.getMonth() && a.getDate() === now.getDate();
  } catch {
    return false;
  }
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
