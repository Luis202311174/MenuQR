# Real-Time Inventory Management System - Setup Checklist

## Phase 1: Database Setup (CRITICAL)

- [ ] **1.1** Log into Supabase console
- [ ] **1.2** Navigate to SQL Editor
- [ ] **1.3** Copy contents of `migrations/add_inventory_system.sql`
- [ ] **1.4** Paste into SQL Editor
- [ ] **1.5** Execute the migration
- [ ] **1.6** Verify all tables/functions created (no errors)
- [ ] **1.7** Check `menu_items` table has new columns:
  - [ ] `stock_count` (integer, nullable)
  - [ ] `current_stock` (integer, nullable)
  - [ ] `is_trackable` (boolean)
  - [ ] `daily_limit` (integer)

**Estimated Time**: 5 minutes  
**Difficulty**: Easy  
**Critical**: YES

---

## Phase 2: Code Integration (HIGH PRIORITY)

### 2.1 Update Customer Menu Page
📁 `src/app/[slug]/page.tsx`

- [ ] **2.1.1** Find `<MenuItemModal ... />` component
- [ ] **2.1.2** Add `businessId={businessId}` prop
- [ ] **2.1.3** Test: Modal displays without errors

**Time**: 5 minutes  
**Files**: 1

---

### 2.2 Update MenuGrid Component
📁 `src/components/MenuGrid.tsx`

- [ ] **2.2.1** Import: `import { useSingleItemInventory } from "@/hooks/useInventory";`
- [ ] **2.2.2** Add to each menu item card:
  ```tsx
  const { label, color } = useSingleItemInventory(businessId, item.id, item.is_trackable);
  ```
- [ ] **2.2.3** Display stock label with color
- [ ] **2.2.4** Show "Out of Stock" overlay if not inStock
- [ ] **2.2.5** Test: Labels appear on menu items

**Time**: 15 minutes  
**Files**: 1

---

### 2.3 Add Inventory Button to Sidebar
📁 `src/components/business/BusinessSidebar.tsx`

- [ ] **2.3.1** Import faWarehouse icon
- [ ] **2.3.2** Add inventory item to navItems array
- [ ] **2.3.3** Test: Button appears in business sidebar

**Time**: 5 minutes  
**Files**: 1

---

### 2.4 Create Inventory Management Page
📁 `src/app/business/inventory/page.tsx` (NEW)

- [ ] **2.4.1** Create new file
- [ ] **2.4.2** Implement page that opens BusinessInventoryModal
- [ ] **2.4.3** Add businessId and menuItems fetching
- [ ] **2.4.4** Test: Page loads and modal opens

**Time**: 10 minutes  
**Files**: 1 new

---

## Phase 3: Feature Testing (MEDIUM PRIORITY)

### 3.1 Real-Time Update Test
- [ ] **3.1.1** Open menu in 2 browser tabs (same business)
- [ ] **3.1.2** In Tab A: Admin → Go to Inventory page
- [ ] **3.1.3** Change item stock from 10 to 5
- [ ] **3.1.4** In Tab B: Stock label updates automatically ✅
- [ ] **3.1.5** No page refresh required

**Time**: 10 minutes

---

### 3.2 Out of Stock Test
- [ ] **3.2.1** Set item stock to 1
- [ ] **3.2.2** Menu shows "Only 1 left!" (red color)
- [ ] **3.2.3** Open item modal
- [ ] **3.2.4** Add button is enabled (qty 1)
- [ ] **3.2.5** Reduce qty to 0 → Add button disabled
- [ ] **3.2.6** Set stock to 0 in admin
- [ ] **3.2.7** Menu shows "Out of Stock" overlay
- [ ] **3.2.8** Item modal shows "🚫 Out of Stock" button

**Time**: 10 minutes

---

### 3.3 Unlimited Test
- [ ] **3.3.1** Set item to trackable with stock 50
- [ ] **3.3.2** Label shows "In Stock"
- [ ] **3.3.3** Toggle to unlimited in admin
- [ ] **3.3.4** Label changes to "Unlimited"
- [ ] **3.3.5** Add button never disables
- [ ] **3.3.6** Quantity can be increased infinitely

**Time**: 10 minutes

---

### 3.4 Order Processing Test
- [ ] **3.4.1** Set burger stock to 3
- [ ] **3.4.2** Add 3 burgers to cart
- [ ] **3.4.3** Proceed to checkout
- [ ] **3.4.4** Submit order
- [ ] **3.4.5** Check database: stock is now 0
- [ ] **3.4.6** Menu updates automatically (no refresh)
- [ ] **3.4.7** "Out of Stock" appears on menu

**Time**: 15 minutes

---

## Phase 4: Performance Validation (LOW PRIORITY)

- [ ] **4.1** Open network tab (DevTools)
- [ ] **4.2** Update stock in admin
- [ ] **4.3** Verify real-time update takes < 500ms
- [ ] **4.4** Check no unnecessary API calls
- [ ] **4.5** Monitor memory usage with 20+ items
- [ ] **4.6** No memory leaks on component unmount

**Time**: 15 minutes

---

## Phase 5: Deployment (FINAL)

- [ ] **5.1** Code review of changes
- [ ] **5.2** Verify all tests pass
- [ ] **5.3** Database migration backed up
- [ ] **5.4** Deploy to staging
- [ ] **5.5** Full regression test on staging
- [ ] **5.6** Deploy to production
- [ ] **5.7** Monitor for 24 hours
- [ ] **5.8** Collect user feedback

**Time**: 30 minutes (excluding monitoring)

---

## Summary

| Phase | Items | Time | Priority |
|-------|-------|------|----------|
| 1: Database | 7 | 5 min | CRITICAL |
| 2: Integration | 13 | 35 min | HIGH |
| 3: Testing | 18 | 45 min | MEDIUM |
| 4: Performance | 6 | 15 min | LOW |
| 5: Deployment | 8 | 30 min | FINAL |
| **TOTAL** | **52** | **130 min** | - |

---

## Quick Reference

### Files Modified
1. `src/components/MenuItemModal.tsx` ✅ Done
2. `src/components/business/BusinessInventoryModal.tsx` ✅ Done (imports added)
3. `src/app/[slug]/page.tsx` - Add businessId prop to MenuItemModal
4. `src/components/MenuGrid.tsx` - Add stock labels
5. `src/components/business/BusinessSidebar.tsx` - Add inventory button

### Files Created
1. `src/utils/inventoryManager.ts` ✅ Done
2. `src/hooks/useInventory.ts` ✅ Done
3. `src/app/business/inventory/page.tsx` - New page
4. `migrations/add_inventory_system.sql` ✅ Done
5. `INVENTORY_SYSTEM.md` ✅ Done
6. `INVENTORY_API.md` ✅ Done
7. `INTEGRATION_TASKS.md` ✅ Done
8. `IMPLEMENTATION_SUMMARY.md` ✅ Done

### Database Changes (via SQL)
- Add 4 columns to menu_items
- Create 2 RPC functions
- Create inventory_audit table
- Add indexes for performance
- Set up real-time subscriptions

---

## Rollback Plan

If anything goes wrong:

```sql
-- Rollback all changes
DROP TABLE IF EXISTS inventory_audit CASCADE;
DROP FUNCTION IF EXISTS reset_daily_stock CASCADE;
DROP FUNCTION IF EXISTS decrement_menu_stock CASCADE;

ALTER TABLE menu_items 
DROP COLUMN IF EXISTS stock_count,
DROP COLUMN IF EXISTS current_stock,
DROP COLUMN IF EXISTS is_trackable,
DROP COLUMN IF EXISTS daily_limit;
```

---

## Success Criteria

✅ **You'll know it's working when:**

1. Menu displays dynamic stock labels ("Only 5 left!")
2. Labels are color-coded (red/yellow/green)
3. Opening 2 tabs shows updates without refresh
4. Out of stock button disables immediately
5. Admin can modify stock levels
6. Changes appear across all users instantly
7. Orders decrement stock automatically
8. No errors in console

---

## Support Resources

1. **INVENTORY_SYSTEM.md** - Full architecture
2. **INVENTORY_API.md** - API reference
3. **INTEGRATION_TASKS.md** - Detailed steps
4. **IMPLEMENTATION_SUMMARY.md** - Overview
5. **This file** - Checklist & quick reference

---

## Notes

- 🔴 **DO NOT skip Phase 1** (Database setup)
- 🟢 **Complete Phase 2** before testing
- 🟡 **Test thoroughly** before production
- 📞 Refer to docs if stuck
- ⏰ Estimated total: 2-3 hours

---

**Last Updated**: May 9, 2026  
**Version**: 1.0  
**Status**: Ready for Implementation

