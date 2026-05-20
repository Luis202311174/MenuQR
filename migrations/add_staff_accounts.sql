-- Staff Accounts, Permissions, and Session Management

-- 1. Ensure UUID generation support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Staff accounts table
CREATE TABLE IF NOT EXISTS staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_accounts_business_id ON staff_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_email ON staff_accounts(email);

-- 3. Staff permissions table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (staff_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_module_name ON staff_permissions(module_name);

-- 4. Staff session table
CREATE TABLE IF NOT EXISTS staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_business_id ON staff_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token_hash ON staff_sessions(token_hash);
