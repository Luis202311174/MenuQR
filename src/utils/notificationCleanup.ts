import { supabase } from "@/lib/supabaseClient";
import {
  AppNotification,
  getStoredNotifications,
  removeNotification,
} from "./notificationManager";

/**
 * Validate and remove stale notifications based on current DB state.
 * - Order notifications: removed if order is completed
 * - Low stock notifications: removed if stock is no longer low
 * - Receipt notifications: removed if already processed
 */
export async function cleanupStaleNotifications() {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications();
  if (!notifications.length) return;

  const toRemove: string[] = [];

  for (const notif of notifications) {
    try {
      if (notif.type === "order") {
        // Check order status
        const orderId = notif.data?.orderId as string;
        if (orderId) {
          const { data: order, error } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();

          if (error) {
            console.warn(`Error fetching order ${orderId}:`, error);
            continue;
          }

          if (order && order.status === "completed") {
            toRemove.push(notif.id);
          }
        }
      } else if (notif.type === "inventory") {
        // Check if stock is no longer low
        const menuItemId = notif.data?.menuItemId as string;
        const lowStockThreshold = notif.data?.lowStockThreshold as number || 5;

        if (menuItemId) {
          const { data: item, error } = await supabase
            .from("menu_items")
            .select("current_stock")
            .eq("id", menuItemId)
            .maybeSingle();

          if (error) {
            console.warn(`Error fetching menu item ${menuItemId}:`, error);
            continue;
          }

          if (item && item.current_stock > lowStockThreshold) {
            toRemove.push(notif.id);
          }
        }
      } else if (notif.type === "receipt") {
        // Check if receipt was already viewed
        const receiptId = notif.data?.receiptId as string;
        if (receiptId) {
          const { data: receipt, error } = await supabase
            .from("orders")
            .select("status")
            .eq("id", receiptId)
            .maybeSingle();

          if (error) {
            console.warn(`Error fetching receipt ${receiptId}:`, error);
            continue;
          }

          if (receipt && receipt.status === "completed") {
            toRemove.push(notif.id);
          }
        }
      }
    } catch (err) {
      console.error(`Error validating notification ${notif.id}:`, err);
    }
  }

  // Remove all stale notifications
  for (const id of toRemove) {
    removeNotification(id);
  }

  if (toRemove.length > 0) {
    console.log(`Cleaned up ${toRemove.length} stale notification(s)`);
  }
}
