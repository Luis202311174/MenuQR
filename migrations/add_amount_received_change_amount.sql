-- Migration: add amount_received and change_amount to orders
-- Run this in Supabase SQL editor or psql connected to your DB

BEGIN;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS amount_received numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS change_amount numeric(12,2) NULL;

COMMIT;

-- Optionally create a payments table for recording payment transactions
-- Uncomment and run if you want a dedicated payments table
--
-- CREATE TABLE IF NOT EXISTS public.payments (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   business_id uuid NOT NULL,
--   order_id uuid NULL,
--   amount numeric(12,2) NOT NULL,
--   currency text DEFAULT 'PHP',
--   method text,
--   provider text,
--   reference_numb text,
--   status text DEFAULT 'completed',
--   metadata jsonb NULL,
--   created_at timestamptz DEFAULT now()
-- );
