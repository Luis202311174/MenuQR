-- GCash customer flow:
-- 1. Customer selects GCash in CheckoutModal.
-- 2. An e-receipt image is required and uploaded to this bucket.
-- 3. The public URL is saved on orders.e_receipt_url with payment_method = 'gcash'.
-- 4. Restaurant staff can use the saved URL to verify the payment before marking it paid.

BEGIN;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS e_receipt_url text NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'e-reciepts',
  'e-reciepts',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Customer checkout may be anonymous or signed in. A public bucket only makes
-- files readable; this separate Storage policy is what permits uploads.
-- Paths are namespaced by business and session by the customer checkout flow.
DROP POLICY IF EXISTS "Anonymous customers can upload e-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public customers can upload e-receipts" ON storage.objects;
CREATE POLICY "Public customers can upload e-receipts"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'e-reciepts');

COMMIT;
