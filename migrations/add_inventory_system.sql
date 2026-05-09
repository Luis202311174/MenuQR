-- Real-Time Inventory Management System - Database Setup

-- 1. Add missing inventory fields to menu_items table
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS current_stock INTEGER,
ADD COLUMN IF NOT EXISTS is_trackable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_business_stock 
ON menu_items(business_id, is_trackable, current_stock);

CREATE INDEX IF NOT EXISTS idx_menu_items_availability 
ON menu_items(business_id, availability, is_trackable);

-- 3. Create RPC function for atomic stock decrement
CREATE OR REPLACE FUNCTION public.decrement_menu_stock(
  item_id uuid,
  quantity integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_val integer;
  business_id_val uuid;
BEGIN
  -- Get current stock with row lock
  SELECT current_stock, business_id INTO current_val, business_id_val
  FROM menu_items
  WHERE id = item_id
  FOR UPDATE;

  -- Check if we have enough stock
  IF current_val IS NULL OR current_val < quantity THEN
    RETURN false;
  END IF;

  -- Log to audit table before decrement
  INSERT INTO inventory_audit (business_id, menu_item_id, previous_stock, new_stock, change_reason, changed_by)
  VALUES (business_id_val, item_id, current_val, current_val - quantity, 'order_decrement', auth.uid());

  -- Atomically decrement
  UPDATE menu_items
  SET current_stock = current_stock - quantity,
      updated_at = now()
  WHERE id = item_id
    AND is_trackable = true;

  RETURN true;
END;
$$;

-- 4. Create function to reset stock to daily limit
CREATE OR REPLACE FUNCTION public.reset_daily_stock(
  business_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
  item_record RECORD;
BEGIN
  -- Log current stock levels before reset
  FOR item_record IN
    SELECT id, current_stock, daily_limit
    FROM menu_items
    WHERE business_id = business_id
      AND is_trackable = true
      AND daily_limit > 0
      AND current_stock IS NOT NULL
  LOOP
    INSERT INTO inventory_audit (business_id, menu_item_id, previous_stock, new_stock, change_reason, changed_by)
    VALUES (business_id, item_record.id, item_record.current_stock, item_record.daily_limit, 'daily_reset', auth.uid());
  END LOOP;

  UPDATE menu_items
  SET current_stock = daily_limit,
      updated_at = now()
  WHERE business_id = business_id
    AND is_trackable = true
    AND daily_limit > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 5. Create audit table for inventory changes
CREATE TABLE IF NOT EXISTS inventory_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  previous_stock integer,
  new_stock integer,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_business 
ON inventory_audit(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_item 
ON inventory_audit(menu_item_id, created_at DESC);

-- 6. Enable realtime for inventory changes
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_audit;

-- 7. Add RLS policies if needed
ALTER TABLE inventory_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business inventory audit"
ON inventory_audit FOR SELECT
USING (
  auth.uid() = changed_by OR
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_id AND owner_id = auth.uid()
  )
);

-- 8. Sample data for testing
-- INSERT INTO menu_items (business_id, name, price, is_trackable, stock_count, current_stock, daily_limit)
-- VALUES (
--   'your-business-id',
--   'Premium Burger',
--   350.00,
--   true,
--   15,
--   15,
--   15
-- );

-- Notes:
-- - Run this migration in your Supabase SQL editor
-- - Update business_id in sample data
-- - Ensure your app has Supabase auth configured
-- - Test with multiple browser windows to verify realtime updates
