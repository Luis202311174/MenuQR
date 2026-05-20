-- Add coupons table for a business-level reward system
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code varchar(50) NOT NULL,
  discount_type varchar(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2) NOT NULL CHECK (discount_value > 0),
  description text,
  is_active boolean DEFAULT true,
  usage_limit integer DEFAULT 1 CHECK (usage_limit > 0),
  usage_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(business_id, code)
);

-- Add coupon usage tracking table that tracks actual coupon redemptions
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  used_at timestamp with time zone DEFAULT now(),
  UNIQUE(coupon_id, order_id)
);

-- Add coupon claims table for reward issuance tracking
CREATE TABLE IF NOT EXISTS public.coupon_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  claimed_at timestamp with time zone DEFAULT now(),
  redeemed_at timestamp with time zone,
  status varchar(20) NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'expired')),
  UNIQUE(coupon_id, order_id)
);

-- Add milestone coupon settings to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS milestone_promo_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_min_spend decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS milestone_custom_code varchar(50),
  ADD COLUMN IF NOT EXISTS milestone_coupon_discount_type varchar(20) CHECK (milestone_coupon_discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS milestone_coupon_discount_value decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS milestone_coupon_usage_limit integer DEFAULT 1 CHECK (milestone_coupon_usage_limit > 0),
  ADD COLUMN IF NOT EXISTS milestone_coupon_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS milestone_coupon_description text,
  ADD COLUMN IF NOT EXISTS milestone_coupon_redemption_minimum decimal(10,2);

-- Add milestone coupon tracking fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS milestone_coupon_awarded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_coupon_awarded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS milestone_coupon_code varchar(50),
  ADD COLUMN IF NOT EXISTS milestone_coupon_claim_id uuid REFERENCES coupon_claims(id);

-- Enable RLS for all coupon-related tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_claims ENABLE ROW LEVEL SECURITY;

-- Create a reward coupon validation function
CREATE OR REPLACE FUNCTION public.validate_and_apply_coupon(
  p_coupon_code text,
  p_business_id uuid,
  p_order_total decimal(10,2)
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  coupon_record record;
  discount_amount decimal(10,2) := 0;
BEGIN
  SELECT * INTO coupon_record
  FROM coupons
  WHERE upper(trim(code)) = upper(trim(p_coupon_code))
    AND business_id = p_business_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND usage_count < usage_limit;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Invalid, expired, or inactive coupon code'
    );
  END IF;

  IF coupon_record.discount_type = 'percentage' THEN
    discount_amount := p_order_total * (coupon_record.discount_value / 100);
  ELSE
    discount_amount := coupon_record.discount_value;
  END IF;

  discount_amount := least(discount_amount, p_order_total);

  RETURN json_build_object(
    'valid', true,
    'coupon_id', coupon_record.id,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value,
    'discount_amount', discount_amount,
    'description', coupon_record.description
  );
END;
$$;

-- Create a helper to mark a coupon as used
CREATE OR REPLACE FUNCTION public.mark_coupon_used(
  coupon_id uuid,
  order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO coupon_usage (coupon_id, order_id, user_id)
  VALUES (coupon_id, order_id, auth.uid());

  UPDATE coupons
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = coupon_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create RLS policies for coupons and coupon usage
CREATE POLICY "Business owners can manage their coupons"
ON coupons FOR ALL USING (business_id IN (
  SELECT id FROM businesses WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can view active coupons for businesses"
ON coupons FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their coupon usage"
ON coupon_usage FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert coupon usage"
ON coupon_usage FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their coupon claims"
ON coupon_claims FOR ALL USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "System can insert coupon claims"
ON coupon_claims FOR INSERT WITH CHECK (true);
