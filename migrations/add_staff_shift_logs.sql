-- Migration: add_staff_shift_logs.sql
-- Creates a table to persist staff shift events (start, break, end)

-- Ensure UUID helper is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS staff_shift_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('start','break','end')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_shift_logs_staff_id ON staff_shift_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_logs_business_id ON staff_shift_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_logs_created_at ON staff_shift_logs(created_at);
