-- Add Senior/PWD discount fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS senior_pwd_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00;
