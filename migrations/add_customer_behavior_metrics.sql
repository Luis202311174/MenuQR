-- Migration: add customer behavior metrics to orders
-- Captures order duration, most ordered item, and spend per order for analytics.

BEGIN;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS order_duration_ms integer NULL,
  ADD COLUMN IF NOT EXISTS most_ordered_item text NULL,
  ADD COLUMN IF NOT EXISTS spend_per_order numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS customer_behavior jsonb NULL;

COMMIT;
