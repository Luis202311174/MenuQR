"use client";

import { useEffect } from "react";
import { requestNotificationPermission } from "@/utils/notificationService";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Avoid registering the service worker in development to prevent stale
    // dev chunks being served by an out-of-date worker. In dev, unregister
    // any existing service workers so the browser loads fresh modules.
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      navigator.serviceWorker.getRegistrations().then((regs) =>
        regs.forEach((r) => {
          try {
            r.unregister();
            console.log("Unregistered service worker (dev):", r.scope);
          } catch (e) {
            /* ignore */
          }
        })
      );
    } else {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("MenuQR service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.warn("MenuQR service worker registration failed:", error);
        });
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void requestNotificationPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  return null;
}
