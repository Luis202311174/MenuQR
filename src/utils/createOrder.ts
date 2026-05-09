import { supabase } from "@/lib/supabaseClient";

// Helper to extract readable error message from Supabase error
function getErrorMessage(err: any): string {
  if (!err) return "Unknown error occurred";
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  if (err.msg) return err.msg;
  if (err.details) return err.details;
  if (err.hint) return err.hint;
  return JSON.stringify(err);
}

export type CreateOrderParams = {
  businessId: string;
  cartItems: any[];
  totalAmount: number;
  tableId: string;
  sessionId: string;
  userId?: string;
  isPaid?: boolean; // New parameter to indicate if order is paid
  totalGuests?: number;
  seniorPwdCount?: number;
  discountAmount?: number;
};

export async function createOrder({
  businessId,
  cartItems,
  totalAmount,
  tableId,
  sessionId,
  userId,
  isPaid = false, // Default to unpaid
  totalGuests,
  seniorPwdCount,
  discountAmount,
}: CreateOrderParams) {
  const qtyByMenuItemId = cartItems.reduce<Record<string, number>>((acc, item) => {
    const qty = Number(item.qty || 1);
    const menuItemId = item.menu_item_id ?? item.id;
    if (!menuItemId) return acc;
    acc[menuItemId] = (acc[menuItemId] || 0) + qty;
    return acc;
  }, {});

  const menuItemIds = Object.keys(qtyByMenuItemId);

  const fetchLatestItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,name,availability,current_stock,is_trackable")
      .in("id", menuItemIds);

    if (error) throw error;
    return data || [];
  };

  const checkStock = (items: any[]) => {
    const unavailableItems = items.filter((item) => item.availability !== true);
    if (unavailableItems.length > 0) {
      throw new Error("Some items are no longer available");
    }

    const stockShortages = items.filter((item) => {
      if (!item.is_trackable) return false;
      const availableStock = Number(item.current_stock ?? 0);
      return availableStock < qtyByMenuItemId[item.id];
    });

    if (stockShortages.length > 0) {
      const shortageDetails = stockShortages.map(item => {
        const availableStock = Number(item.current_stock ?? 0);
        return `${item.name || 'Item'}: ${availableStock} left`;
      }).join(', ');
      throw new Error(`Insufficient stock: ${shortageDetails}. Please adjust your order.`);
    }
  };

  const updateResults: Array<{ id: string; oldStock: number }> = [];

  try {
    let latestItems = await fetchLatestItems();
    checkStock(latestItems);

    for (const item of latestItems) {
      if (!item.is_trackable) continue;
      const qty = qtyByMenuItemId[item.id] || 0;

      // Use the database function for atomic stock decrement
      const { data: stockResult, error: stockError } = await supabase
        .rpc('decrement_menu_stock', {
          item_id: item.id,
          quantity: qty
        });

      if (stockError) {
        const errorMsg = getErrorMessage(stockError);
        console.error("RPC error details:", stockError);
        throw new Error(`Stock decrement failed: ${errorMsg}`);
      }

      if (!stockResult) {
        // Stock decrement failed - fetch current stock for error message
        const { data: currentItem } = await supabase
          .from("menu_items")
          .select("name,current_stock")
          .eq("id", item.id)
          .single();

        const availableStock = Number(currentItem?.current_stock ?? 0);
        throw new Error(`Sorry, only ${availableStock} ${currentItem?.name || 'item'}(s) left in stock. Please adjust your order.`);
      }

      updateResults.push({ id: item.id, oldStock: Number(item.current_stock ?? 0) });
    }

    const orderData: any = {
      business_id: businessId,
      items: cartItems,
      total_amount: totalAmount,
      status: "pending",
      table_id: tableId,
      session_id: sessionId,
      is_paid: isPaid,
      total_guests: totalGuests ?? 0,
      senior_pwd_count: seniorPwdCount ?? 0,
      discount_amount: discountAmount ?? 0,
      ...(userId ? { user_id: userId } : {}),
    };

    const { data, error } = await supabase.from("orders").insert(orderData).select("*").single();
    if (error) {
      const errorMsg = getErrorMessage(error);
      console.error("Order insert error:", error);
      throw new Error(`Failed to create order: ${errorMsg}`);
    }

    return data;
  } catch (err: any) {
    // Rollback stock to original values for failed orders
    if (updateResults.length) {
      try {
        await Promise.all(
          updateResults.map((update) =>
            supabase
              .from("menu_items")
              .update({
                current_stock: update.oldStock,
              })
              .eq("id", update.id)
          )
        );
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
    }

    // Properly format error for client
    const errorMessage = getErrorMessage(err);
    console.error("createOrder error details:", { original: err, formatted: errorMessage });
    const formattedError = new Error(errorMessage);
    throw formattedError;
  }
}