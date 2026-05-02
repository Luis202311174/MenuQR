# Fix Order Status Bug - TODO

## Problem
Payment method modal automatically sets status to `paid` instead of `pending_payment` due to a race condition in `OrdersButton.tsx` and premature `status: "paid"` update in `[slug]/page.tsx`.

## Steps

- [x] Step 1: Remove auto-trigger `useEffect` in `src/components/OrdersButton.tsx` that calls `onPaymentComplete` prematurely
- [x] Step 2: Fix `finalizePayment` in `src/app/[slug]/page.tsx` to not set `status: "paid"` / `is_paid: true` (business should do that)
- [x] Step 3: Fix `handlePayBill` in `src/app/[slug]/page.tsx` to not set `status: "paid"` / `is_paid: true`

