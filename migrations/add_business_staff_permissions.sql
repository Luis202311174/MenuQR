-- Add business staff table with permissions and role fields
CREATE TABLE IF NOT EXISTS business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  permissions text[] NOT NULL DEFAULT ARRAY['orders','inventory']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_staff_business_id ON business_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_business_staff_user_id ON business_staff(user_id);
