## 🎯 Order & Payment Flow Implementation Guide

This guide explains the complete order and payment system that has been implemented for MenuQR.

---

## 📋 System Overview

The system now supports a complete order lifecycle with the following capabilities:

1. **Dual Payment Confirmation**: Business can acknowledge orders as either "Received (Unpaid)" or "Paid"
2. **Multi-Order Sessions**: Customers can order multiple items over time in one session
3. **Status Tracking**: Real-time status updates from order entry through completion
4. **Receipt Management**: Auto-generated and stored receipts for each order
5. **Payment Processing**: Support for multiple payment methods (GCash, Cash)

---

## 🔄 Order Status Flow

### Status Progression

```
UNPAID PATH:
  received (unpaid) → preparing → ready → served → completed

PAID PATH:
  paid → preparing → ready → served → completed
```

### Status Definitions

| Status | Description | Label | User View |
|--------|-------------|-------|-----------|
| **received** | Order received, awaiting confirmation | Received - Unpaid | Awaiting kitchen |
| **paid** | Payment confirmed, ready for kitchen | Paid - Preparing | Kitchen in progress |
| **preparing** | Currently being prepared | Preparing | In kitchen |
| **ready** | Prepared, ready for service | Ready to Serve | Ready to pick up |
| **served** | Delivered to customer | Order Served | Received, eating |
| **completed** | Customer finished, session ended | Completed | Removed from queue |

---

## 👥 User Journey - Customer

### Initial Order
1. **Scan QR Code** → Enter table/session
2. **Browse Menu** → Add items to cart
3. **Submit Order**
4. **Receive Options:**
   - ✅ **"Order More"** → Clear cart, add new items (returns to step 2)
   - 💳 **"Pay Bill"** → Proceed to payment

### Multiple Orders in One Session
- Each order is tracked separately with its own ID
- All orders are grouped under one session
- Receipt shows ALL orders in the session
- Can pay for all orders at once

### Payment
1. **Select Payment Method:**
   - 💳 GCash QR Code
   - 💵 Cash
2. **Process Payment** → Confirmation
3. **View Receipt** → Exit session

---

## 🏪 Business Dashboard - Order Management

### Order Confirmation (First Step)

When an order arrives, business sees two options:

| Option | Meaning | Status | Next Action |
|--------|---------|--------|-------------|
| **✓ Order Received** | Customer wants to pay later | `received` (is_paid: false) | Start Preparing |
| **✓ Order Paid** | Customer already paid | `paid` (is_paid: true) | Start Preparing |

### Full Order Workflow

```
New Order (received)
    ↓
[Business Choice: Order Received OR Order Paid]
    ↓
👨‍🍳 Start Preparing
    ↓
📦 Mark Ready
    ↓
🍽️ Mark Served
    ↓
✅ Complete Order
```

### Dashboard Statistics

- **To Confirm**: Unpaid orders awaiting confirmation
- **Preparing**: Orders in kitchen (paid or confirmed unpaid)
- **Ready to Serve**: Completed orders waiting for pickup
- **Served**: Delivered orders awaiting completion
- **Queue Value**: Total monetary value of active orders

---

## 🛠️ Technical Implementation

### New Utility Files

#### `orderStatusManager.ts`
```typescript
// Check order status and get display label
getOrderStatusLabel(status, isPaid)

// Transition order to new status
confirmOrderReceived(orderId)
confirmOrderPaid(orderId)
markOrderPreparing(orderId)
markOrderReady(orderId)
markOrderServed(orderId)
markOrderCompleted(orderId)

// Validate transitions
canTransitionTo(currentStatus, newStatus)
getNextStatuses(currentStatus)
```

#### `paymentManager.ts`
```typescript
// Process session payment
processSessionPayment(sessionId, paymentMethod)

// Track payment amounts
getSessionPaidAmount(sessionId)
getSessionUnpaidAmount(sessionId)
```

#### `receiptManager.ts`
```typescript
// Store receipt for later viewing
storeSessionReceipt(sessionId, businessId)

// Retrieve stored receipts
getStoredReceipts()

// Format for display/print
formatReceiptForDisplay(receipt)
generateReceiptHTML(receipt)
```

### Updated Components

#### OrdersButton.tsx
- **New Props:**
  - `sessionId`: Track current session
  - `businessId`: For receipt storage
  - `tableId`: Table identification

- **New State:**
  - `showOrderAgainModal`: After order served
  - `processingPayment`: Payment in progress
  - `paymentSuccess`: Payment confirmation

- **New Modals:**
  - Order Again Modal (after served)
  - Enhanced Payment Modal (GCash/Cash options)

#### Business Orders Page
- **New Status Buttons:**
  - "Order Received" (for unpaid orders)
  - "Order Paid" (for customer-paid orders)
  - "Start Preparing" (begins kitchen process)
  - "Mark Ready" (order complete)
  - "Mark Served" (customer received)
  - "Complete Order" (finalize, table available)

- **Enhanced Dashboard:**
  - Separate cards for each status
  - Real-time counter updates
  - Visual status indicators

---

## 💡 Key Features Explained

### 1. Order Received vs Order Paid

**Scenario A: Customer wants to pay later**
1. Order arrives at business
2. Business clicks "Order Received"
3. Status: `received` (is_paid: false)
4. Label: "Received - Unpaid"
5. Order enters kitchen
6. At end of session, customer pays all orders together

**Scenario B: Customer pays immediately**
1. Order arrives at business
2. Business clicks "Order Paid" (customer already paid via QR/cash)
3. Status: `paid` (is_paid: true)
4. Label: "Paid - Preparing"
5. Order goes directly to kitchen

### 2. Multi-Order Session

Customer scenario:
1. First order: 2 items
2. Business confirms and kitchen starts
3. Customer adds more items: 3 items
4. Second order submitted
5. Business confirms second order
6. Both orders prepared in parallel
7. Both delivered
8. Customer sees "Order Again?" or "Pay Bill?"
9. If "Order Again": New items can be added (receipt of both orders stored)
10. If "Pay Bill": Pay for all items (Php 5 + Php 8 = Php 13 total)

### 3. Receipt Storage

Receipts are automatically stored when:
- Customer chooses "Pay Bill" after an order is served
- Shows all items from all orders in current session
- Stored in browser localStorage
- Displayed in modal for preview/printing

### 4. Payment Processing

Current implementation supports:
- **GCash QR**: Display QR code for scanning
- **Cash**: Manual payment confirmation

Future integration can add:
- Stripe integration
- Payment gateway confirmation
- Transaction ID tracking

---

## 🔐 Database Schema (No Changes Required)

Uses existing `orders` table:
- `status`: Now includes "preparing" and "served"
- `is_paid`: Boolean flag for payment confirmation
- `items`: JSON array of order items
- `session_id`: Groups multiple orders
- `table_id`: Links to table

Optional enhancement: Create `payment_records` table
```sql
CREATE TABLE payment_records (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  session_id UUID,
  business_id UUID,
  amount DECIMAL,
  payment_method TEXT,
  status TEXT,
  created_at TIMESTAMP
);
```

---

## ⚙️ Configuration & Customization

### Status Colors
Edit `getStatusColor()` in `orderStatusManager.ts`:
```typescript
case "preparing":
  return "bg-blue-100 text-blue-800"; // Change colors here
```

### Payment Methods
Add new methods in `OrdersButton.tsx` payment modal:
```typescript
<button onClick={() => handlePaymentMethodSelect("paypal")}>
  PayPal
</button>
```

### Receipt Format
Customize in `receiptManager.ts`:
- `formatReceiptForDisplay()`: Text format
- `generateReceiptHTML()`: HTML format for printing

---

## 🧪 Testing Checklist

- [ ] Submit order → see "Order More" or "Pay Bill" options
- [ ] Choose "Order More" → cart clears, add new items
- [ ] Submit second order → see both orders in status tab
- [ ] Business: Receive first order → click "Order Received"
- [ ] Business: Receive second order → click "Order Paid"
- [ ] Business: Start preparing both orders
- [ ] Business: Mark both ready
- [ ] Business: Mark first served → customer sees "Order Again?"
- [ ] Customer: Choose "Order Again" → can add more items
- [ ] Customer: Choose "Pay Bill" → select payment method
- [ ] Payment processes → receipt displayed
- [ ] Session ends → table marked available

---

## 🚀 Next Steps (Optional Enhancements)

1. **Payment Gateway Integration**
   - Connect to GCash API
   - Stripe integration
   - Payment verification

2. **Email/SMS Notifications**
   - Order confirmation to customer
   - Ready notification
   - Receipt email

3. **Kitchen Display System**
   - Separate kitchen view
   - Order priorities
   - Time tracking

4. **Analytics**
   - Order frequency per table
   - Payment methods analysis
   - Peak hours tracking

5. **Refund System**
   - Mark orders as cancelled
   - Partial/full refunds
   - Reversal logic

---

## 📞 Support

For issues or questions:
1. Check implementation summary document
2. Review utility files (orderStatusManager, paymentManager, receiptManager)
3. Check component implementations (OrdersButton, BusinessOrders page)
4. Verify Supabase real-time subscriptions are active
