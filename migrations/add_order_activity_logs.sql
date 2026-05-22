-- Migration: add_order_activity_logs.sql
-- Tracks activity events for orders (accepted, marked_paid, prepared, served, etc.)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS order_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  business_id uuid NOT NULL,
  staff_id uuid NULL,
  action text NOT NULL,
  actor_name text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_orders FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_businesses FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_activity_order_id ON order_activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_staff_id ON order_activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_business_id ON order_activity_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_created_at ON order_activity_logs(created_at);
