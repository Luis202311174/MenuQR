-- Migration: Add a new staff_users table only.
-- This assumes public.users already exists and should not be recreated.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.staff_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_users_pkey PRIMARY KEY (id),
  CONSTRAINT staff_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_users_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT staff_users_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON public.staff_users(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_business_id ON public.staff_users(business_id);

-- Migrate existing staff_accounts rows into staff_users when a matching public.users profile already exists.
INSERT INTO public.staff_users (user_id, business_id, role, status, last_login_at, created_at)
SELECT u.id, s.business_id, s.role, s.status, s.last_login_at, s.created_at
FROM public.staff_accounts s
JOIN public.users u ON lower(u.email) = lower(s.email)
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_users su WHERE su.user_id = u.id
);
