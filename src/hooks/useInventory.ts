import { useEffect, useState, useCallback } from "react";
import { InventoryManager, StockUpdate } from "@/utils/inventoryManager";

export interface UseInventoryOptions {
  businessId?: string;
  itemIds?: string[];
  enabled?: boolean;
}

export interface InventoryState {
  [itemId: string]: {
    stock: number | null;
    lastUpdated: number;
  };
}

/**
 * Hook for real-time inventory updates
 */
export function useInventory(options: UseInventoryOptions = {}) {
  const { businessId, enabled = true } = options;
  const [inventory, setInventory] = useState<InventoryState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = useCallback((update: StockUpdate) => {
    setInventory((prev) => ({
      ...prev,
      [update.itemId]: {
        stock: update.newStock,
        lastUpdated: update.timestamp,
      },
    }));
  }, []);

  useEffect(() => {
    if (!enabled || !businessId) return;

    setLoading(true);

    const unsubscribe = InventoryManager.subscribeToBusinessInventory(
      businessId,
      handleUpdate
    );

    setLoading(false);

    return () => {
      unsubscribe();
    };
  }, [businessId, enabled, handleUpdate]);

  const updateStock = useCallback(
    async (itemId: string, newStock: number | null) => {
      const result = await InventoryManager.updateInventory(itemId, newStock);
      if (!result.success) {
        setError(result.error || "Failed to update inventory");
      } else {
        setError(null);
      }
      return result;
    },
    []
  );

  const getStockLabel = useCallback(
    (itemId: string, isTrackable: boolean) => {
      const stock = inventory[itemId]?.stock;
      return InventoryManager.getStockLabel(stock, isTrackable);
    },
    [inventory]
  );

  const getStockColor = useCallback(
    (itemId: string, isTrackable: boolean) => {
      const stock = inventory[itemId]?.stock;
      return InventoryManager.getStockColor(stock, isTrackable);
    },
    [inventory]
  );

  const isInStock = useCallback(
    (itemId: string, isTrackable: boolean) => {
      const stock = inventory[itemId]?.stock;
      return InventoryManager.isInStock(stock, isTrackable);
    },
    [inventory]
  );

  return {
    inventory,
    loading,
    error,
    updateStock,
    getStockLabel,
    getStockColor,
    isInStock,
  };
}

/**
 * Hook for single item inventory
 */
export function useSingleItemInventory(
  businessId: string | undefined,
  itemId: string | undefined,
  isTrackable: boolean | undefined = false
) {
  const { inventory, ...rest } = useInventory({ businessId, enabled: !!businessId });

  const stock = itemId ? inventory[itemId]?.stock : null;
  const label = itemId ? InventoryManager.getStockLabel(stock, isTrackable ?? false) : "Unlimited";
  const color = itemId ? InventoryManager.getStockColor(stock, isTrackable ?? false) : "text-gray-600";
  const inStock = itemId ? InventoryManager.isInStock(stock, isTrackable ?? false) : true;
  const urgency = itemId ? InventoryManager.getUrgencyLevel(stock, isTrackable ?? false) : "unlimited";

  return {
    stock,
    label,
    color,
    inStock,
    urgency,
    ...rest,
  };
}
