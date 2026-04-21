## Integration Guide - Using the New Order System

This guide shows you how to integrate the new OrdersButton component with the new payment and order management system.

---

## 📝 OrdersButton Component Props

### Required Props
```typescript
cartItems: CartItem[]           // Current cart items
cartTotal: number               // Total of current cart
orderStatus: string             // "none" | "received" | "paid" | "preparing" | "ready" | "served"
isDineIn: boolean               // Whether table QR was scanned
submittingOrder: boolean        // Loading state during order submission
onSubmitOrder: () => void       // Callback when user submits order
onRemoveItem: (index: number) => void  // Remove item from cart
```

### Optional Props (NEW)
```typescript
currentOrder?: OrderData        // Most recent order for this table
sessionOrders?: OrderData[]     // All orders in current session
unpaidOrders?: OrderData[]      // Unpaid orders in session
onPayBill?: () => void          // Callback when payment is processed
sessionId?: string              // Current session ID (NEW - REQUIRED for payment)
businessId?: string             // Business ID (NEW - REQUIRED for receipt storage)
tableId?: string                // Table ID (NEW)
badgeCount?: number             // Badge showing item count
```

### Updated Props to Pass
```typescript
showOrderMoreModal: boolean           // Show "Order More?" prompt
onCloseOrderMoreModal: () => void     // Close the order more modal
```

---

## 🔧 Example Implementation

### In your page component (user-facing)

```typescript
import { useState, useEffect } from 'react';
import OrdersButton from '@/components/OrdersButton';
import { fetchActiveOrder } from '@/utils/fetchActiveOrder';
import { createOrder } from '@/utils/createOrder';

export default function MenuPage() {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orderStatus, setOrderStatus] = useState('none');
  const [isDineIn, setIsDineIn] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  
  // NEW: Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);

  // When table QR is scanned
  const handleTableScanned = (scannedSessionId: string, scannedTableId: string, scannedBusinessId: string) => {
    setSessionId(scannedSessionId);
    setTableId(scannedTableId);
    setBusinessId(scannedBusinessId);
    setIsDineIn(true);
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!sessionId || !tableId || !businessId) return;

    setSubmittingOrder(true);
    try {
      const newOrder = await createOrder({
        businessId,
        cartItems,
        totalAmount: cartTotal,
        tableId,
        sessionId,
        isPaid: false, // Initially unpaid
      });

      setCurrentOrder(newOrder);
      setOrderStatus('received');
      
      // Add to session orders
      setSessionOrders([...sessionOrders, newOrder]);
      setUnpaidOrders([...unpaidOrders, newOrder]);
      
      // Clear cart
      setCartItems([]);
      setCartTotal(0);

      // Show "Order More?" modal
      setShowOrderMoreModal(true);
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle payment
  const handlePayBill = async () => {
    if (!sessionId) return;
    
    // Payment is now handled inside OrdersButton via processSessionPayment
    // After payment succeeds, this callback is triggered
    console.log('Payment completed');
    
    // Reset for next session
    setSessionId(null);
    setTableId(null);
    setBusinessId(null);
    setIsDineIn(false);
    setSessionOrders([]);
    setUnpaidOrders([]);
    setCurrentOrder(null);
    setOrderStatus('none');
  };

  return (
    <div>
      {/* Your menu items here */}
      
      <OrdersButton
        // Required
        cartItems={cartItems}
        cartTotal={cartTotal}
        orderStatus={orderStatus}
        isDineIn={isDineIn}
        submittingOrder={submittingOrder}
        onSubmitOrder={handleSubmitOrder}
        onRemoveItem={(index) => {
          setCartItems(cartItems.filter((_, i) => i !== index));
          setCartTotal(cartTotal - (cartItems[index]?.price || 0));
        }}
        
        // Optional but recommended
        currentOrder={currentOrder}
        sessionOrders={sessionOrders}
        unpaidOrders={unpaidOrders}
        onPayBill={handlePayBill}
        
        // NEW: Session info
        sessionId={sessionId}
        businessId={businessId}
        tableId={tableId}
        
        // Order more modal
        showOrderMoreModal={showOrderMoreModal}
        onCloseOrderMoreModal={() => setShowOrderMoreModal(false)}
      />
    </div>
  );
}
```

---

## 🏪 Business Orders Page Integration

The business orders page has been updated and is ready to use. Key features:

### Automatic Status Management
```typescript
// All status updates are handled automatically
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  switch (newStatus) {
    case "received":
      await confirmOrderReceived(orderId);
      break;
    case "paid":
      await confirmOrderPaid(orderId);
      break;
    // ... other statuses
  }
};
```

### Available Buttons
1. **Order Received** - Mark unpaid order as acknowledged
2. **Order Paid** - Mark order as paid
3. **Start Preparing** - Move to kitchen
4. **Mark Ready** - Finished, ready for service
5. **Mark Served** - Customer received order
6. **Complete Order** - Finalize and free up table

---

## 📊 Real-Time Updates

Both customer and business sides use Supabase real-time subscriptions:

```typescript
// Already implemented in components
const channel = supabase
  .channel(`orders-${businessId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `business_id=eq.${businessId}`
  }, (payload) => {
    // Handle updates automatically
  })
  .subscribe();
```

---

## 🔗 API/Function Reference

### Order Status Manager
```typescript
import {
  confirmOrderReceived,
  confirmOrderPaid,
  markOrderPreparing,
  markOrderReady,
  markOrderServed,
  markOrderCompleted,
  getOrderStatusLabel,
  getStatusColor,
  canTransitionTo
} from '@/utils/orderStatusManager';
```

### Payment Manager
```typescript
import {
  processSessionPayment,
  getSessionPaymentRecords,
  getSessionPaidAmount,
  getSessionUnpaidAmount,
  areAllSessionOrdersCompleted
} from '@/utils/paymentManager';
```

### Receipt Manager
```typescript
import {
  storeSessionReceipt,
  getStoredReceipts,
  clearStoredReceipts,
  formatReceiptForDisplay,
  generateReceiptHTML
} from '@/utils/receiptManager';
```

---

## 🧪 Common Integration Issues

### Issue: OrdersButton not showing modals
**Solution:** Make sure all state variables are passed correctly:
```typescript
showOrderMoreModal={showOrderMoreModal}
onCloseOrderMoreModal={() => setShowOrderMoreModal(false)}
```

### Issue: Payment not processing
**Solution:** Ensure sessionId and businessId are set:
```typescript
sessionId={sessionId}
businessId={businessId}
```

### Issue: Status not updating in business dashboard
**Solution:** Check Supabase real-time subscription:
1. Verify business_id filter is correct
2. Check orders table permissions
3. Ensure channel subscription is active

### Issue: Receipt not showing
**Solution:** Receipt is stored in localStorage:
```typescript
const receipts = getStoredReceipts(); // Get stored receipts
clearStoredReceipts();                 // Clear after viewing
```

---

## 🚀 Testing in Development

### 1. Test Order Submission
```typescript
// In browser console
localStorage.getItem('sessionReceipts') // Check receipts
```

### 2. Test Real-Time Updates
- Open business dashboard and customer menu side-by-side
- Submit order on customer side
- Verify it appears in business dashboard in real-time

### 3. Test Payment Flow
1. Submit first order
2. Choose "Order More" → Add more items
3. Submit second order
4. Choose "Pay Bill"
5. Select payment method
6. Verify both orders marked as paid
7. Check localStorage for receipt

### 4. Test Business Workflow
1. Customer submits order
2. Business clicks "Order Received"
3. Business clicks "Start Preparing"
4. Business clicks "Mark Ready"
5. Business clicks "Mark Served"
6. Verify customer sees "Order Again?" prompt
7. Business clicks "Complete Order"
8. Verify order removed from dashboard

---

## 📋 Deployment Checklist

Before going live:

- [ ] Test order submission with real Supabase connection
- [ ] Test payment processing (at least locally)
- [ ] Verify real-time updates work across different browser tabs
- [ ] Test multi-order session with 3+ orders
- [ ] Test "Order Again" flow
- [ ] Test all payment methods (GCash, Cash)
- [ ] Check receipt generation and printing
- [ ] Verify table availability resets after completion
- [ ] Test business dashboard status transitions
- [ ] Verify no console errors in production build
- [ ] Test with slow network (3G simulation)
- [ ] Test on mobile devices
