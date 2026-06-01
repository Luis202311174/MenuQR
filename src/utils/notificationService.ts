import {
  type AppNotification,
  getStoredNotifications,
  markNotificationShown,
  isAcknowledgedToday,
  isShownToday,
} from "@/utils/notificationManager";

const DEFAULT_ICON = "/logo.png";

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isBrowserNotificationSupported()) return null;
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export async function showSystemNotification(notification: AppNotification) {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const existing = getStoredNotifications().find((n) => n.id === notification.id);
  if (existing && (isAcknowledgedToday(existing) || isShownToday(existing))) return;

  const options: NotificationOptions = {
    body: notification.message,
    icon: DEFAULT_ICON,
    badge: DEFAULT_ICON,
    data: {
      href: notification.href,
      type: notification.type,
      timestamp: notification.timestamp,
      data: notification.data,
      id: notification.id,
    },
  };

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, options);
      markNotificationShown(notification.id);
      return;
    }
  } catch (error) {
    console.warn("Service worker notification failed, falling back to window Notification:", error);
  }

  new Notification(notification.title, options);
  markNotificationShown(notification.id);
}
