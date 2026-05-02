import { supabase } from "@/lib/supabaseClient";

export interface SessionReceipt {
  id: string;
  session_id: string;
  orders: {
    id: string;
    created_at: string;
    items: any[];
    total_amount: number;
    status: string;
    is_paid: boolean;
  }[];
  total_amount: number;
  timestamp: string;
}

/**
 * Store receipt data before continuing with new order
 */
export async function storeSessionReceipt(sessionId: string, businessId: string) {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("session_id", sessionId)
    .eq("business_id", businessId);

  if (ordersError) throw ordersError;

  const totalAmount = (orders || []).reduce((sum, order) => sum + Number(order.total_amount), 0);

  const receipt: SessionReceipt = {
    id: `receipt-${Date.now()}`,
    session_id: sessionId,
    orders: orders || [],
    total_amount: totalAmount,
    timestamp: new Date().toISOString(),
  };

  // Store receipt in localStorage for display
  if (typeof window !== "undefined") {
    const receipts = JSON.parse(localStorage.getItem("sessionReceipts") || "[]");
    receipts.push(receipt);
    localStorage.setItem("sessionReceipts", JSON.stringify(receipts));
  }

  return receipt;
}

/**
 * Get all stored receipts for current session
 */
export function getStoredReceipts(): SessionReceipt[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem("sessionReceipts") || "[]");
  } catch {
    return [];
  }
}

/**
 * Clear stored receipts after session ends
 */
export function clearStoredReceipts() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("sessionReceipts");
  }
}

/**
 * Check if user wants to order again after order is served
 * Returns true if user wants to continue, false if they want to finish
 */
export async function handleOrderAgain(
  sessionId: string,
  tableId: string,
  userWantsMore: boolean
): Promise<{
  continueSession: boolean;
  message: string;
}> {
  if (!userWantsMore) {
    // User wants to finish
    return {
      continueSession: false,
      message: "Thank you for your order. Please proceed to payment.",
    };
  }

  // User wants to order again - session continues
  return {
    continueSession: true,
    message: "Great! Your session continues. Add items to your cart.",
  };
}

/**
 * Format receipt for display
 */
export function formatReceiptForDisplay(receipt: SessionReceipt): string {
  const lines: string[] = [];
  lines.push("=".repeat(40));
  lines.push("ORDER RECEIPT");
  lines.push("=".repeat(40));
  lines.push("");
  lines.push(`Time: ${new Date(receipt.timestamp).toLocaleString()}`);
  lines.push("");

  receipt.orders.forEach((order, index) => {
    lines.push(`Order #${index + 1} (ID: ${order.id.slice(-6)})`);
    lines.push(`Status: ${order.status}`);
    lines.push(`Payment: ${order.is_paid ? "PAID" : "UNPAID"}`);
    lines.push("-".repeat(40));

    order.items.forEach((item) => {
      const itemTotal = (Number(item.price) * item.quantity).toFixed(2);
      lines.push(`${item.name} x${item.quantity}`);
      lines.push(`  ₱${itemTotal}`);
    });

    lines.push("-".repeat(40));
    lines.push(`Subtotal: ₱${Number(order.total_amount).toFixed(2)}`);
    lines.push("");
  });

  lines.push("=".repeat(40));
  lines.push(`TOTAL: ₱${receipt.total_amount.toFixed(2)}`);
  lines.push("=".repeat(40));

  return lines.join("\n");
}

/**
 * Generate receipt HTML for printing
 */
export function generateReceiptHTML(receipt: SessionReceipt): string {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: monospace; width: 300px; margin: 0; padding: 10px; }
          .header { text-align: center; font-weight: bold; margin-bottom: 10px; }
          .order-item { margin: 10px 0; }
          .line { border-bottom: 1px solid #000; margin: 5px 0; }
          .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
          .item-line { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">ORDER RECEIPT</div>
        <div>Time: ${new Date(receipt.timestamp).toLocaleString()}</div>
        <div class="line"></div>
  `;

  receipt.orders.forEach((order, index) => {
    html += `
      <div class="order-item">
        <strong>Order #${index + 1}</strong>
        <div class="item-line">
          <span>Status:</span>
          <span>${order.status}</span>
        </div>
        <div class="item-line">
          <span>Payment:</span>
          <span>${order.is_paid ? "PAID" : "UNPAID"}</span>
        </div>
    `;

    order.items.forEach((item) => {
      const itemTotal = (Number(item.price) * item.quantity).toFixed(2);
      html += `
        <div class="item-line">
          <span>${item.name} x${item.quantity}</span>
          <span>₱${itemTotal}</span>
        </div>
      `;
    });

    html += `
        <div class="line"></div>
        <div class="item-line" style="font-weight: bold;">
          <span>Subtotal:</span>
          <span>₱${Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>
    `;
  });

  html += `
        <div class="line"></div>
        <div class="total">
          <div class="item-line">
            <span>TOTAL:</span>
            <span>₱${receipt.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}
