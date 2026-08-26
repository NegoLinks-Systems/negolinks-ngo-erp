-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 001 — Foundation: extensions, helpers, organization and identity
-- Schema version: 012
--
-- Every migration in this product is idempotent: running it twice is safe and
-- produces the same result. Verified against PostgreSQL 16.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

-- Keeps updated_at accurate without application involvement.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  legal_name           TEXT NOT NULL DEFAULT '',
  org_type             TEXT NOT NULL DEFAULT 'NGO',
  registration_number  TEXT,
  tax_id               TEXT,
  logo_url             TEXT,
  primary_color        TEXT,
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  country              TEXT NOT NULL DEFAULT 'Nigeria',
  email                TEXT,
  phone                TEXT,
  website              TEXT,
  base_currency        TEXT NOT NULL DEFAULT 'NGN',
  locale               TEXT NOT NULL DEFAULT 'en-NG',
  timezone             TEXT NOT NULL DEFAULT 'Africa/Lagos',
  date_format          TEXT NOT NULL DEFAULT 'dd MMM yyyy',
  financial_year_start TEXT NOT NULL DEFAULT '01-01',
  mission              TEXT,
  vision               TEXT,
  demo_mode            BOOLEAN NOT NULL DEFAULT false,
  license_tier         TEXT NOT NULL DEFAULT 'professional',
  license_expires_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID,
  is_demo              BOOLEAN NOT NULL DEFAULT false
);

-- Organizations are their own tenant root, so org_id mirrors the primary key.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS org_id UUID;
UPDATE public.organizations SET org_id = id WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON public.organizations (deleted_at);

DROP TRIGGER IF EXISTS trg_organizations_updated ON public.organizations;
CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Branches and departments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  branch_type TEXT NOT NULL DEFAULT 'field_office',
  country     TEXT NOT NULL DEFAULT 'Nigeria',
  state       TEXT,
  city        TEXT,
  address     TEXT,
  manager_id  UUID,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches (org_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_branches_updated ON public.branches;
CREATE TRIGGER trg_branches_updated
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL DEFAULT '',
  head_id     UUID,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments (org_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Application users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id      UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  auth_user_id   UUID UNIQUE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  job_title      TEXT,
  role           TEXT NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('super_admin','admin','manager','staff','viewer')),
  department_id  UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_login_at  TIMESTAMPTZ,
  mfa_enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID,
  is_demo        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_app_users_org ON public.app_users (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_auth ON public.app_users (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_org_email
  ON public.app_users (org_id, lower(email)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_app_users_updated ON public.app_users;
CREATE TRIGGER trg_app_users_updated
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Board and trustees
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.board_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  position      TEXT NOT NULL,
  member_type   TEXT NOT NULL DEFAULT 'board'
                CHECK (member_type IN ('board','trustee','management','advisory')),
  email         TEXT,
  phone         TEXT,
  appointed_on  DATE,
  term_ends_on  DATE,
  bio           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID,
  is_demo       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_board_members_org ON public.board_members (org_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_board_members_updated ON public.board_members;
CREATE TRIGGER trg_board_members_updated
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tenancy and role helpers
--
-- Defined after app_users exists because SQL function bodies are validated at
-- creation time.
-- -----------------------------------------------------------------------------

-- The organization the signed-in user belongs to. Used by every RLS policy.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
$$;

-- The signed-in user's application role.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
$$;

-- Row belongs to the caller's organization.
CREATE OR REPLACE FUNCTION public.is_member_of(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_org IS NOT NULL AND target_org = public.current_org_id();
$$;

-- Caller holds an administrative role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'admin');
$$;

-- Caller may approve, delete or otherwise act with elevated permission.
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'admin', 'manager');
$$;

-- Caller may create and edit records.
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'admin', 'manager', 'staff');
$$;
