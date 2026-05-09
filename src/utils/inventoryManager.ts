import { supabase } from "@/lib/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";

export type InventoryItem = {
  id: string;
  name: string;
  is_trackable: boolean;
  current_stock: number | null;
};

export type StockUpdate = {
  itemId: string;
  previousStock: number | null;
  newStock: number | null;
  timestamp: number;
};

export class InventoryManager {
  private static subscriptions: Map<string, RealtimeChannel> = new Map();
  private static listeners: Map<string, Set<(update: StockUpdate) => void>> = new Map();

  /**
   * Subscribe to real-time stock updates for a business
   */
  static subscribeToBusinessInventory(
    businessId: string,
    onUpdate: (update: StockUpdate) => void
  ): () => void {
    // Initialize listener set if needed
    if (!this.listeners.has(businessId)) {
      this.listeners.set(businessId, new Set());
    }

    const listeners = this.listeners.get(businessId)!;
    listeners.add(onUpdate);

    // Set up channel if not already done
    if (!this.subscriptions.has(businessId)) {
      const channel = supabase
        .channel(`business:${businessId}:inventory`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "menu_items",
            filter: `business_id=eq.${businessId}`,
          },
          (payload: any) => {
            const update: StockUpdate = {
              itemId: payload.new.id,
              previousStock: payload.old.current_stock ?? null,
              newStock: payload.new.current_stock ?? null,
              timestamp: Date.now(),
            };

            // Notify all listeners
            listeners.forEach((listener) => listener(update));
          }
        )
        .subscribe();

      this.subscriptions.set(businessId, channel);
    }

    // Return unsubscribe function
    return () => {
      listeners.delete(onUpdate);
      if (listeners.size === 0) {
        const channel = this.subscriptions.get(businessId);
        if (channel) {
          supabase.removeChannel(channel);
          this.subscriptions.delete(businessId);
        }
        this.listeners.delete(businessId);
      }
    };
  }

  /**
   * Get formatted stock label for customer UI
   */
  static getStockLabel(stock: number | null, isTrackable: boolean): string {
    if (!isTrackable || stock === null) {
      return "Unlimited";
    }

    if (stock === 0) {
      return "Out of Stock";
    }

    if (stock <= 5) {
      return `Only ${stock} left!`;
    }

    if (stock <= 10) {
      return `Only ${stock} left`;
    }

    return "In Stock";
  }

  /**
   * Get stock status color for UI
   */
  static getStockColor(stock: number | null, isTrackable: boolean): string {
    if (!isTrackable || stock === null) {
      return "text-gray-600";
    }

    if (stock === 0) {
      return "text-red-600";
    }

    if (stock <= 5) {
      return "text-red-500";
    }

    if (stock <= 10) {
      return "text-yellow-500";
    }

    return "text-green-600";
  }

  /**
   * Update inventory for a menu item
   */
  static async updateInventory(
    itemId: string,
    newStock: number | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First get current stock for audit
      const { data: currentItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("current_stock, business_id")
        .eq("id", itemId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      // Update stock
      const { error } = await supabase
        .from("menu_items")
        .update({
          current_stock: newStock,
        })
        .eq("id", itemId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log to audit table
      if (currentItem) {
        await supabase
          .from("inventory_audit")
          .insert({
            business_id: currentItem.business_id,
            menu_item_id: itemId,
            previous_stock: currentItem.current_stock,
            new_stock: newStock,
            change_reason: "manual_update",
            changed_by: (await supabase.auth.getUser()).data.user?.id,
          });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Toggle item between trackable and unlimited
   */
  static async toggleTrackable(
    itemId: string,
    isTrackable: boolean,
    limitValue: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First get current state for audit
      const { data: currentItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("current_stock, business_id, is_trackable")
        .eq("id", itemId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      const newTrackable = !isTrackable;
      const newStock = newTrackable ? limitValue : null;

      const { error } = await supabase
        .from("menu_items")
        .update({
          is_trackable: newTrackable,
          current_stock: newStock,
        })
        .eq("id", itemId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log to audit table
      if (currentItem) {
        await supabase
          .from("inventory_audit")
          .insert({
            business_id: currentItem.business_id,
            menu_item_id: itemId,
            previous_stock: currentItem.current_stock,
            new_stock: newStock,
            change_reason: newTrackable ? "enabled_tracking" : "disabled_tracking",
            changed_by: (await supabase.auth.getUser()).data.user?.id,
          });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get current stock for an item
   */
  static async getStock(itemId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("current_stock")
        .eq("id", itemId)
        .single();

      if (error) return null;
      return data?.current_stock ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Check if item is in stock
   */
  static isInStock(stock: number | null, isTrackable: boolean): boolean {
    if (!isTrackable) return true;
    return stock === null || stock > 0;
  }

  /**
   * Get urgency level for UI urgency indicators
   */
  static getUrgencyLevel(
    stock: number | null,
    isTrackable: boolean
  ): "unlimited" | "available" | "low" | "critical" | "sold-out" {
    if (!isTrackable || stock === null) {
      return "unlimited";
    }

    if (stock === 0) {
      return "sold-out";
    }

    if (stock <= 3) {
      return "critical";
    }

    if (stock <= 8) {
      return "low";
    }

    return "available";
  }
}
