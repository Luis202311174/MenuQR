"use client";

import { useEffect } from "react";
import { requestNotificationPermission } from "@/utils/notificationService";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("MenuQR service worker registered:", registration.scope);
      })
      .catch((error) => {
        console.warn("MenuQR service worker registration failed:", error);
      });

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void requestNotificationPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  return null;
}
