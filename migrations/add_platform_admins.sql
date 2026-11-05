-- Platform-wide administrators are granted manually by a trusted database operator.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Admin grants are only read by server routes using the service-role key.
REVOKE ALL ON TABLE public.platform_admins FROM anon, authenticated;
GRANT ALL ON TABLE public.platform_admins TO service_role;

CREATE INDEX IF NOT EXISTS platform_admins_granted_at_idx
  ON public.platform_admins (granted_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  record_id text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_admin_audit_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.platform_admin_audit_logs TO service_role;

CREATE INDEX IF NOT EXISTS platform_admin_audit_logs_created_at_idx
  ON public.platform_admin_audit_logs (created_at DESC);

-- After the target user has a Supabase Auth account, replace the email below and
-- run this manually in the Supabase SQL editor to grant the first administrator:
--
-- INSERT INTO public.platform_admins (user_id, granted_by)
-- SELECT id, id
-- FROM auth.users
-- WHERE lower(email) = lower('admin@example.com')
-- ON CONFLICT (user_id) DO NOTHING;
