BEGIN;

CREATE TABLE IF NOT EXISTS coupon_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  coupon_code text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'awarded'
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_claims_order_id_uindex ON coupon_claims(order_id);
CREATE INDEX IF NOT EXISTS coupon_claims_coupon_id_idx ON coupon_claims(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_claims_user_coupon_idx ON coupon_claims(user_id, coupon_id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS milestone_coupon_awarded boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS milestone_coupon_awarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_coupon_code text,
  ADD COLUMN IF NOT EXISTS milestone_coupon_claim_id uuid REFERENCES coupon_claims(id) ON DELETE SET NULL;

COMMIT;
