-- Milestone Promotion Settings
-- Adds business-level milestone promo configuration for unlocking coupons after order completion.

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS milestone_promo_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS target_min_spend decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS associated_coupon_code varchar(50);

-- Additional milestone coupon defaults (optional settings to pre-fill milestone coupon creation)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS milestone_number_of_coupons integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS milestone_custom_code varchar(50),
ADD COLUMN IF NOT EXISTS milestone_coupon_discount_type varchar(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS milestone_coupon_discount_value decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS milestone_coupon_usage_limit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS milestone_coupon_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS milestone_coupon_description text;
