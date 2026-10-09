"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import {
  getStoredLowStockNotifications,
  storeLowStockNotification,
  removeLowStockNotification,
  acknowledgeLowStockItems,
  getAcknowledgedLowStockItemIds,
  removeLowStockAcknowledgements,
} from "@/utils/lowStockNotifications";
import { storeNotification, removeNotification } from "@/utils/notificationManager";

type Notif = {
  id: string;
  name: string;
  current_stock: number;
  daily_limit?: number | null;
  timestamp: string;
  category?: string;
};

function isFullyStocked(item: Pick<Notif, "current_stock" | "daily_limit">, lowThreshold: number) {
  const targetStock = Number(item.daily_limit ?? 0);
  return targetStock > 0
    ? item.current_stock >= targetStock
    : item.current_stock > lowThreshold;
}

export default function BusinessInventoryNotifier({ lowThreshold = 5 }: { lowThreshold?: number }) {
  const { checked, businessId } = useBusinessAuth();
  const [notifs, setNotifs] = useState<Notif[]>(() => getStoredLowStockNotifications());
  const [isOpen, setIsOpen] = useState(false);

  const clearLowStockAlerts = (itemId: string) => {
    removeLowStockNotification(itemId);
    removeNotification(`low-stock-${itemId}`);
    setNotifs((prev) => prev.filter((n) => n.id !== itemId));
  };

  useEffect(() => {
    const syncLowStockNotifications = () => {
      const notifications = getStoredLowStockNotifications();
      setNotifs(notifications);
      if (notifications.length === 0) setIsOpen(false);
    };

    window.addEventListener("lowStockNotificationsUpdated", syncLowStockNotifications);
    const openLowStockModal = () => {
      setNotifs(getStoredLowStockNotifications());
      setIsOpen(true);
    };
    window.addEventListener("openLowStockAlertModal", openLowStockModal);

    if (sessionStorage.getItem("openLowStockAlert") === "true") {
      sessionStorage.removeItem("openLowStockAlert");
      openLowStockModal();
    }

    return () => {
      window.removeEventListener("lowStockNotificationsUpdated", syncLowStockNotifications);
      window.removeEventListener("openLowStockAlertModal", openLowStockModal);
    };
  }, []);

  useEffect(() => {
    if (!checked || !businessId) return;

    let mounted = true;

    const loadInitial = async () => {
      try {
        // Query all menu items for this business (include unavailable/out-of-stock)
        const { data: items, error } = await supabase
          .from("menu_items")
          .select("id,name,category,other_category,current_stock,daily_limit,is_trackable")
          .eq("business_id", businessId);

        if (error) throw error;
        if (!mounted || !items) return;
        const existingLow = getStoredLowStockNotifications();
        const existingLowIds = new Set(existingLow.map((item) => item.id));
        const low: Notif[] = (items as any[])
          .filter((it) => {
            if (!it.is_trackable) return false;
            const stock = Number(it.current_stock ?? 0);
            return stock <= lowThreshold || (
              existingLowIds.has(it.id) &&
              !isFullyStocked({ current_stock: stock, daily_limit: it.daily_limit }, lowThreshold)
            );
          })
          .map((it) => ({
            id: it.id,
            name: it.name,
            current_stock: Number(it.current_stock ?? 0),
            daily_limit: it.daily_limit,
            timestamp: new Date().toISOString(),
            category: it.category === "other" ? it.other_category || "Other" : it.category || "Other",
          }));
        const currentLowIds = new Set(low.map((item) => item.id));
        removeLowStockAcknowledgements(
          (items as any[])
            .filter((item) => !currentLowIds.has(item.id))
            .map((item) => item.id)
        );
        const acknowledgedIds = new Set(getAcknowledgedLowStockItemIds());

        // Remove any stale low-stock alerts that are no longer low.
        existingLow.forEach((stored) => {
          if (!currentLowIds.has(stored.id)) {
            removeLowStockNotification(stored.id);
            removeNotification(`low-stock-${stored.id}`);
          }
        });

        low.forEach((item) => {
          storeLowStockNotification(item);
          if (!acknowledgedIds.has(item.id)) {
            const notification = {
              id: `low-stock-${item.id}`,
              type: "inventory" as const,
              title: "Low stock alert",
              message: `${item.name} is low: ${item.current_stock} left`,
              href: "/business/inventory",
              timestamp: item.timestamp,
              data: { itemId: item.id, current_stock: item.current_stock },
            };
            storeNotification(notification);
          }
        });
        setNotifs(low);

        if (low.some((item) => !acknowledgedIds.has(item.id))) {
          setIsOpen(true);
        }
      } catch (e) {
        console.error("Inventory notifier initial load failed", e);
      }
    };

    loadInitial();

    const channel = supabase
      .channel(`business-inventory-${businessId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_items", filter: `business_id=eq.${businessId}` },
        (payload: any) => {
          try {
            const oldStock = Number((payload.old as any)?.current_stock ?? 0);
            const newStock = Number((payload.new as any)?.current_stock ?? 0);
            const oldTrackable = Boolean((payload.old as any)?.is_trackable);
            const newTrackable = Boolean((payload.new as any)?.is_trackable);
            const itemId = (payload.new as any)?.id || (payload.old as any)?.id;

            if (!itemId) return;

            // If transitioned from above threshold to <= threshold, notify
            if (newTrackable && newStock <= lowThreshold && oldStock > lowThreshold) {
              removeLowStockAcknowledgements([itemId]);
              const notif: Notif = {
                id: itemId,
                name: (payload.new as any).name,
                current_stock: newStock,
                daily_limit: (payload.new as any).daily_limit,
                timestamp: new Date().toISOString(),
                category: (payload.new as any).category === "other"
                  ? (payload.new as any).other_category || "Other"
                  : (payload.new as any).category || "Other",
              };
              storeLowStockNotification(notif);
              const notification = {
                id: `low-stock-${notif.id}`,
                type: "inventory" as const,
                title: "Low stock alert",
                message: `${notif.name} is low: ${notif.current_stock} left`,
                href: "/business/inventory",
                timestamp: notif.timestamp,
                data: { itemId: notif.id, current_stock: notif.current_stock },
              };
              storeNotification(notification);
              setNotifs((prev) => {
                if (prev.some((p) => p.id === notif.id)) return prev;
                return [notif, ...prev];
              });
              setIsOpen(true);
            }

            const existingAlert = getStoredLowStockNotifications().some((item) => item.id === itemId);
            if (newTrackable && existingAlert) {
              if (isFullyStocked(
                { current_stock: newStock, daily_limit: (payload.new as any)?.daily_limit },
                lowThreshold
              )) {
                removeLowStockAcknowledgements([itemId]);
                clearLowStockAlerts(itemId);
              } else {
                const updatedNotif: Notif = {
                  id: itemId,
                  name: (payload.new as any).name,
                  current_stock: newStock,
                  daily_limit: (payload.new as any).daily_limit,
                  timestamp: new Date().toISOString(),
                  category: (payload.new as any).category === "other"
                    ? (payload.new as any).other_category || "Other"
                    : (payload.new as any).category || "Other",
                };
                storeLowStockNotification(updatedNotif);
                setNotifs((prev) => prev.map((item) => item.id === itemId ? updatedNotif : item));
              }
            }

            if (oldTrackable && !newTrackable) {
              removeLowStockAcknowledgements([itemId]);
              clearLowStockAlerts(itemId);
            }
          } catch (err) {
            console.error("Inventory notif error", err);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [checked, businessId, lowThreshold]);

  const groupedNotifs = notifs.reduce<Record<string, Notif[]>>((groups, notif) => {
    const category = notif.category?.trim() || "Other";
    (groups[category] ??= []).push(notif);
    return groups;
  }, {});

  if (!businessId) return null;

  return (
    <>
      {/* Modal popup */}
      {isOpen && notifs.length > 0 ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[80vh] max-h-[720px] min-h-[280px] w-full max-w-2xl flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Low stock alert</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Tracked items remain here until fully stocked.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const ids = notifs.map((notif) => notif.id);
                    acknowledgeLowStockItems(ids);
                    setIsOpen(false);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Acknowledge all
                </button>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {Object.entries(groupedNotifs).map(([category, items]) => (
                <details key={category} className="group overflow-hidden rounded-lg border border-gray-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                    <span>{category}</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      {items.length} {items.length === 1 ? "item" : "items"}
                      <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </summary>
                  <div className="grid gap-2 p-3">
                    {items.map((n) => (
                      <div key={n.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-50">
                            <span className="text-sm font-semibold text-yellow-700">{n.current_stock}</span>
                          </div>
                          <div>
                            <p className="font-medium">{n.name}</p>
                            <p className="text-xs text-gray-500">
                              Remaining: {n.current_stock}{n.daily_limit ? ` / ${n.daily_limit}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
