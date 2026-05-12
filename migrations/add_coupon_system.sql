-- Coupon/Promo Code System - Database Setup

-- 1. Create coupons table
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

    -- Ensure unique codes per business
    UNIQUE(business_id, code)
);

-- 2. Create coupon usage tracking table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    used_at timestamp with time zone DEFAULT now(),

    -- Ensure one coupon per order
    UNIQUE(coupon_id, order_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_business_active
ON coupons(business_id, is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_coupons_code
ON coupons(code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon
ON coupon_usage(coupon_id);

-- 4. Add coupon fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id),
ADD COLUMN IF NOT EXISTS coupon_discount decimal(10,2) DEFAULT 0;

-- 5. Create function to validate and apply coupon
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
  result json;
BEGIN
  -- Find active coupon
  SELECT * INTO coupon_record
  FROM coupons
  WHERE code = upper(trim(p_coupon_code))
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

  -- Calculate discount
  IF coupon_record.discount_type = 'percentage' THEN
    discount_amount := p_order_total * (coupon_record.discount_value / 100);
  ELSE
    discount_amount := coupon_record.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order total
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

-- 6. Create function to mark coupon as used
CREATE OR REPLACE FUNCTION public.mark_coupon_used(
  coupon_id uuid,
  order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert usage record
  INSERT INTO coupon_usage (coupon_id, order_id, user_id)
  VALUES (coupon_id, order_id, auth.uid());

  -- Increment usage count
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

-- 7. Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
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