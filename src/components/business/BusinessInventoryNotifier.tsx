"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import {
  getStoredLowStockNotifications,
  storeLowStockNotification,
  clearStoredLowStockNotifications,
  removeLowStockNotification,
} from "@/utils/lowStockNotifications";
import { storeNotification, removeNotification } from "@/utils/notificationManager";

type Notif = {
  id: string;
  name: string;
  current_stock: number;
  timestamp: string;
};

export default function BusinessInventoryNotifier({ lowThreshold = 5 }: { lowThreshold?: number }) {
  const { checked, businessId } = useBusinessAuth();
  const [notifs, setNotifs] = useState<Notif[]>(() => getStoredLowStockNotifications());
  const [isOpen, setIsOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearLowStockAlerts = (itemId: string) => {
    removeLowStockNotification(itemId);
    removeNotification(`low-stock-${itemId}`);
    setNotifs((prev) => prev.filter((n) => n.id !== itemId));
  };

  useEffect(() => {
    if (!checked || !businessId) return;

    let mounted = true;

    const loadInitial = async () => {
      try {
        // Query all menu items for this business (include unavailable/out-of-stock)
        const { data: items } = await supabase
          .from("menu_items")
          .select("id,name,current_stock,is_trackable")
          .eq("business_id", businessId);

        if (!mounted || !items) return;
        const low = (items as any[])
          .filter((it) => it.is_trackable && Number(it.current_stock ?? 0) <= lowThreshold)
          .map((it) => ({ id: it.id, name: it.name, current_stock: Number(it.current_stock ?? 0) }));
        const existingLow = getStoredLowStockNotifications();
        const currentLowIds = new Set(low.map((item) => item.id));

        // Remove any stale low-stock alerts that are no longer low.
        existingLow.forEach((stored) => {
          if (!currentLowIds.has(stored.id)) {
            removeLowStockNotification(stored.id);
            removeNotification(`low-stock-${stored.id}`);
          }
        });

        setNotifs((prev) => prev.filter((notif) => currentLowIds.has(notif.id)));

        if (low.length > 0) {
          const timestamp = new Date().toISOString();
          low.forEach((item) => {
            storeLowStockNotification({ ...item, timestamp });
            storeNotification({
              id: `low-stock-${item.id}`,
              type: "inventory",
              title: "Low stock alert",
              message: `${item.name} is low: ${item.current_stock} left`,
              href: "/business/inventory",
              timestamp,
              data: { itemId: item.id, current_stock: item.current_stock },
            });
          });
          setNotifs((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...low.filter((l: Notif) => !ids.has(l.id)), ...prev];
          });
          setIsOpen(true);
          try {
            // play a short alert
            playBeep(620, 0.18, 0.16);
          } catch (e) {
            /* no-op */
          }
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
              const notif: Notif = {
                id: itemId,
                name: (payload.new as any).name,
                current_stock: newStock,
                timestamp: new Date().toISOString(),
              };
              storeLowStockNotification(notif);
              storeNotification({
                id: `low-stock-${notif.id}`,
                type: "inventory",
                title: "Low stock alert",
                message: `${notif.name} is low: ${notif.current_stock} left`,
                href: "/business/inventory",
                timestamp: notif.timestamp,
                data: { itemId: notif.id, current_stock: notif.current_stock },
              });
              setNotifs((prev) => {
                if (prev.some((p) => p.id === notif.id)) return prev;
                return [notif, ...prev];
              });
              setIsOpen(true);
              try {
                playBeep(880, 0.12, 0.18);
              } catch (err) {
                /* no-op */
              }
            }

            // If restocked above threshold or tracking disabled, clear the low stock alert
            if ((oldTrackable && oldStock <= lowThreshold && newStock > lowThreshold) || (oldTrackable && !newTrackable)) {
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

  if (!businessId) return null;

  return (
    <>
      {/* Modal popup */}
      {isOpen && notifs.length > 0 ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-gray-100 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Low stock alert</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Items below threshold — restock as soon as possible.</p>
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
                    getStoredLowStockNotifications().forEach((stored) => clearLowStockAlerts(stored.id));
                    setIsOpen(false);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Acknowledge all
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {notifs.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-yellow-50 flex items-center justify-center">
                      <span className="text-sm font-semibold text-yellow-700">{n.current_stock}</span>
                    </div>
                    <div>
                      <p className="font-medium">{n.name}</p>
                      <p className="text-xs text-gray-500">Remaining: {n.current_stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        clearLowStockAlerts(n.id);
                      }}
                      className="rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// Play a short beep using Web Audio API. Safe to call repeatedly.
function playBeep(freq = 880, duration = 0.12, volume = 0.2) {
  try {
    // respect user mute setting stored in localStorage
    if (typeof window !== 'undefined' && localStorage.getItem('notifierMuted') === 'true') return;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.stop(now + duration + 0.02);
    // close context shortly after to free resources
    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, (duration + 0.05) * 1000);
  } catch (e) {
    // ignore errors (e.g., autoplay restrictions)
  }
}
