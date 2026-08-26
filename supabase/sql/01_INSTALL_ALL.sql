-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- 01_INSTALL_ALL.sql — complete database installation
--
-- Schema version: 012
-- Verified against PostgreSQL 16 (Supabase).
--
-- WHAT THIS DOES
--   Creates every table, index, trigger, security policy and reference record
--   the application needs. Running it on an existing database upgrades that
--   database in place without losing data.
--
-- SAFE TO RUN TWICE
--   Every statement is idempotent. If a step has already been applied it is
--   skipped, so re-running this file after a partial failure is the correct
--   recovery action.
--
-- HOW TO RUN
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Paste this entire file
--   3. Press Run  (expect roughly 10-30 seconds)
--   4. Look for the SUCCESS notice at the end
--
-- If you want a completely clean database first, run 00_RESET_DATABASE.sql
-- before this file. That destroys all data and is not needed for upgrades.
-- =============================================================================


-- #############################################################################
-- ## STEP 001 — Foundation: extensions, helpers, organization and identity
-- #############################################################################

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

-- #############################################################################
-- ## STEP 002 — Programmes, projects, donors, grants and fundraising
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                 TEXT NOT NULL,
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'General',
  description          TEXT,
  goal                 TEXT,
  manager_id           UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  start_date           DATE,
  end_date             DATE,
  budget_minor         BIGINT NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'NGN',
  status               TEXT NOT NULL DEFAULT 'planning'
                       CHECK (status IN ('planning','active','on_hold','completed','closed')),
  target_beneficiaries INTEGER NOT NULL DEFAULT 0,
  locations            TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_programs_org ON public.programs (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_programs_demo ON public.programs (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_programs_updated ON public.programs;
CREATE TRIGGER trg_programs_updated
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.donors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  donor_type              TEXT NOT NULL DEFAULT 'Foundation',
  country                 TEXT,
  contact_person          TEXT,
  email                   TEXT,
  phone                   TEXT,
  address                 TEXT,
  website                 TEXT,
  reporting_requirements  TEXT,
  preferences             TEXT,
  relationship_owner_id   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  total_committed_minor   BIGINT NOT NULL DEFAULT 0,
  total_received_minor    BIGINT NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'NGN',
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('prospect','active','dormant','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_donors_org ON public.donors (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donors_demo ON public.donors (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_donors_updated ON public.donors;
CREATE TRIGGER trg_donors_updated
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  donor_id                UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  program_id              UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  stage                   TEXT NOT NULL DEFAULT 'opportunity'
                          CHECK (stage IN ('opportunity','research','application','submitted','under_review','awarded','active','reporting','closed')),
  amount_requested_minor  BIGINT NOT NULL DEFAULT 0,
  amount_awarded_minor    BIGINT NOT NULL DEFAULT 0,
  amount_disbursed_minor  BIGINT NOT NULL DEFAULT 0,
  amount_utilized_minor   BIGINT NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'NGN',
  application_deadline    DATE,
  submitted_on            DATE,
  award_date              DATE,
  start_date              DATE,
  end_date                DATE,
  next_report_due         DATE,
  reporting_frequency     TEXT NOT NULL DEFAULT 'quarterly'
                          CHECK (reporting_frequency IN ('monthly','quarterly','biannual','annual','final_only')),
  compliance_status       TEXT NOT NULL DEFAULT 'compliant'
                          CHECK (compliance_status IN ('compliant','at_risk','breach')),
  focus_area              TEXT,
  requirements            TEXT,
  probability_percent     INTEGER NOT NULL DEFAULT 50 CHECK (probability_percent BETWEEN 0 AND 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_grants_org ON public.grants (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grants_demo ON public.grants (org_id, is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_grants_stage ON public.grants (org_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grants_end_date ON public.grants (org_id, end_date) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_grants_updated ON public.grants;
CREATE TRIGGER trg_grants_updated
  BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                   TEXT NOT NULL,
  title                  TEXT NOT NULL,
  description            TEXT,
  program_id             UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  donor_id               UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  grant_id               UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  funding_source         TEXT,
  manager_id             UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  sector                 TEXT NOT NULL DEFAULT 'General',
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','proposal','pending_approval','approved','active','suspended','completed','closed')),
  start_date             DATE,
  end_date               DATE,
  location               TEXT,
  country                TEXT NOT NULL DEFAULT 'Nigeria',
  state                  TEXT,
  latitude               DOUBLE PRECISION,
  longitude              DOUBLE PRECISION,
  budget_minor           BIGINT NOT NULL DEFAULT 0,
  spent_minor            BIGINT NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL DEFAULT 'NGN',
  progress_percent       INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  target_beneficiaries   INTEGER NOT NULL DEFAULT 0,
  reached_beneficiaries  INTEGER NOT NULL DEFAULT 0,
  risk_level             TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  closure_note           TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_demo ON public.projects (org_id, is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_program ON public.projects (program_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  activity_type    TEXT NOT NULL DEFAULT 'activity' CHECK (activity_type IN ('activity','milestone','deliverable')),
  planned_start    DATE,
  planned_end      DATE,
  actual_end       DATE,
  status           TEXT NOT NULL DEFAULT 'planned'
                   CHECK (status IN ('planned','in_progress','completed','delayed','cancelled')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  responsible_id   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  budget_minor     BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_activities_org ON public.project_activities (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_activities_demo ON public.project_activities (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_project_activities_updated ON public.project_activities;
CREATE TRIGGER trg_project_activities_updated
  BEFORE UPDATE ON public.project_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_risks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Operational',
  description   TEXT,
  likelihood    TEXT NOT NULL DEFAULT 'medium' CHECK (likelihood IN ('low','medium','high')),
  impact        TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low','medium','high')),
  mitigation    TEXT,
  owner_id      UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigating','closed')),
  register_type TEXT NOT NULL DEFAULT 'project' CHECK (register_type IN ('project','organizational')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_risks_org ON public.project_risks (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_risks_demo ON public.project_risks (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_project_risks_updated ON public.project_risks;
CREATE TRIGGER trg_project_risks_updated
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_team (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role_on_project    TEXT NOT NULL DEFAULT 'Team Member',
  allocation_percent INTEGER NOT NULL DEFAULT 100 CHECK (allocation_percent BETWEEN 0 AND 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_team_org ON public.project_team (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_team_demo ON public.project_team (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_project_team_updated ON public.project_team;
CREATE TRIGGER trg_project_team_updated
  BEFORE UPDATE ON public.project_team
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.grant_disbursements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  grant_id      UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  tranche_no    INTEGER NOT NULL DEFAULT 1,
  amount_minor  BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'NGN',
  due_date      DATE,
  received_date DATE,
  status        TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected','received','overdue')),
  reference     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_grant_disbursements_org ON public.grant_disbursements (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grant_disbursements_demo ON public.grant_disbursements (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_grant_disbursements_updated ON public.grant_disbursements;
CREATE TRIGGER trg_grant_disbursements_updated
  BEFORE UPDATE ON public.grant_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.grant_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  grant_id       UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  period_start   DATE,
  period_end     DATE,
  due_date       DATE NOT NULL,
  submitted_date DATE,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','draft','submitted','accepted','overdue')),
  narrative      TEXT,
  prepared_by    UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_grant_reports_org ON public.grant_reports (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grant_reports_demo ON public.grant_reports (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_grant_reports_updated ON public.grant_reports;
CREATE TRIGGER trg_grant_reports_updated
  BEFORE UPDATE ON public.grant_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  channel         TEXT NOT NULL DEFAULT 'Online',
  target_minor    BIGINT NOT NULL DEFAULT 0,
  raised_minor    BIGINT NOT NULL DEFAULT 0,
  pledged_minor   BIGINT NOT NULL DEFAULT 0,
  expenses_minor  BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','paused','completed')),
  owner_id        UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_demo ON public.campaigns (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.donations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  reference      TEXT NOT NULL,
  campaign_id    UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  donor_id       UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  donor_name     TEXT NOT NULL DEFAULT 'Anonymous Donor',
  donation_type  TEXT NOT NULL DEFAULT 'donation' CHECK (donation_type IN ('donation','pledge')),
  amount_minor   BIGINT NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'NGN',
  received_on    DATE,
  pledge_due_on  DATE,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  status         TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('pledged','received','cancelled')),
  is_anonymous   BOOLEAN NOT NULL DEFAULT false,
  note           TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_donations_org ON public.donations (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donations_demo ON public.donations (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_donations_updated ON public.donations;
CREATE TRIGGER trg_donations_updated
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- #############################################################################
-- ## STEP 003 — Beneficiaries, MEL, field operations and people
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  head_name      TEXT NOT NULL,
  size           INTEGER NOT NULL DEFAULT 1,
  female_count   INTEGER NOT NULL DEFAULT 0,
  male_count     INTEGER NOT NULL DEFAULT 0,
  children_count INTEGER NOT NULL DEFAULT 0,
  income_band    TEXT,
  community      TEXT,
  state          TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_households_org ON public.households (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_households_demo ON public.households (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_households_updated ON public.households;
CREATE TRIGGER trg_households_updated
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  household_id   UUID REFERENCES public.households(id) ON DELETE SET NULL,
  gender         TEXT NOT NULL DEFAULT 'female' CHECK (gender IN ('female','male','other')),
  date_of_birth  DATE,
  age            INTEGER,
  phone          TEXT,
  id_type        TEXT,
  id_number      TEXT,
  country        TEXT NOT NULL DEFAULT 'Nigeria',
  state          TEXT,
  lga            TEXT,
  community      TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  vulnerability  TEXT[],
  status         TEXT NOT NULL DEFAULT 'registered'
                 CHECK (status IN ('registered','enrolled','active','graduated','exited')),
  is_anonymized  BOOLEAN NOT NULL DEFAULT false,
  registered_on  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_org ON public.beneficiaries (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_demo ON public.beneficiaries (org_id, is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_community ON public.beneficiaries (org_id, community) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_beneficiaries_updated ON public.beneficiaries;
CREATE TRIGGER trg_beneficiaries_updated
  BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  program_id     UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  enrolled_on    DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_on        DATE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','dropped')),
  outcome        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_enrollments_org ON public.enrollments (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_demo ON public.enrollments (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_enrollments_updated ON public.enrollments;
CREATE TRIGGER trg_enrollments_updated
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.service_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  service_type   TEXT NOT NULL,
  service_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity       NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit           TEXT,
  value_minor    BIGINT NOT NULL DEFAULT 0,
  delivered_by   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  location       TEXT,
  note           TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_service_records_org ON public.service_records (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_records_demo ON public.service_records (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_service_records_updated ON public.service_records;
CREATE TRIGGER trg_service_records_updated
  BEFORE UPDATE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.case_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  case_type      TEXT NOT NULL DEFAULT 'General',
  priority       TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','assessment','intervention','referred','follow_up','closed')),
  case_worker_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  opened_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_on      DATE,
  summary        TEXT,
  outcome        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_case_files_org ON public.case_files (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_files_demo ON public.case_files (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_case_files_updated ON public.case_files;
CREATE TRIGGER trg_case_files_updated
  BEFORE UPDATE ON public.case_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.case_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  case_id     UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  note_type   TEXT NOT NULL DEFAULT 'note'
              CHECK (note_type IN ('assessment','intervention','referral','follow_up','note','closure')),
  note_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  content     TEXT NOT NULL,
  author_id   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  referred_to TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_case_notes_org ON public.case_notes (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_notes_demo ON public.case_notes (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_case_notes_updated ON public.case_notes;
CREATE TRIGGER trg_case_notes_updated
  BEFORE UPDATE ON public.case_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.indicators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  project_id            UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  program_id            UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  level                 TEXT NOT NULL DEFAULT 'output'
                        CHECK (level IN ('input','activity','output','outcome','impact')),
  unit                  TEXT NOT NULL DEFAULT 'count',
  baseline_value        NUMERIC(16,2) NOT NULL DEFAULT 0,
  target_value          NUMERIC(16,2) NOT NULL DEFAULT 0,
  actual_value          NUMERIC(16,2) NOT NULL DEFAULT 0,
  disaggregation        TEXT,
  means_of_verification TEXT,
  frequency             TEXT NOT NULL DEFAULT 'quarterly'
                        CHECK (frequency IN ('monthly','quarterly','biannual','annual')),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_indicators_org ON public.indicators (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicators_demo ON public.indicators (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_indicators_updated ON public.indicators;
CREATE TRIGGER trg_indicators_updated
  BEFORE UPDATE ON public.indicators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.indicator_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  value        NUMERIC(16,2) NOT NULL DEFAULT 0,
  female_value NUMERIC(16,2) NOT NULL DEFAULT 0,
  male_value   NUMERIC(16,2) NOT NULL DEFAULT 0,
  location     TEXT,
  source       TEXT,
  verified     BOOLEAN NOT NULL DEFAULT false,
  recorded_by  UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_indicator_results_org ON public.indicator_results (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicator_results_demo ON public.indicator_results (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_indicator_results_updated ON public.indicator_results;
CREATE TRIGGER trg_indicator_results_updated
  BEFORE UPDATE ON public.indicator_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.logframe_rows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  level                 TEXT NOT NULL CHECK (level IN ('goal','impact','outcome','output','activity')),
  parent_id             UUID,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  statement             TEXT NOT NULL,
  indicator             TEXT,
  means_of_verification TEXT,
  assumptions           TEXT,
  baseline              TEXT,
  target                TEXT,
  actual                TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_logframe_rows_org ON public.logframe_rows (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_logframe_rows_demo ON public.logframe_rows (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_logframe_rows_updated ON public.logframe_rows;
CREATE TRIGGER trg_logframe_rows_updated
  BEFORE UPDATE ON public.logframe_rows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.evaluations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  program_id      UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  evaluation_type TEXT NOT NULL DEFAULT 'baseline'
                  CHECK (evaluation_type IN ('baseline','midterm','endline','impact','process','survey')),
  status          TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','in_progress','completed','published')),
  lead_id         UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  planned_date    DATE,
  completed_date  DATE,
  methodology     TEXT,
  sample_size     INTEGER NOT NULL DEFAULT 0,
  key_findings    TEXT,
  recommendations TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_evaluations_org ON public.evaluations (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_demo ON public.evaluations (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_evaluations_updated ON public.evaluations;
CREATE TRIGGER trg_evaluations_updated
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.learning_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'lesson'
             CHECK (entry_type IN ('lesson','best_practice','success_story','knowledge')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  category   TEXT,
  content    TEXT NOT NULL,
  author_id  UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tags       TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_learning_entries_org ON public.learning_entries (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_learning_entries_demo ON public.learning_entries (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_learning_entries_updated ON public.learning_entries;
CREATE TRIGGER trg_learning_entries_updated
  BEFORE UPDATE ON public.learning_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.field_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code              TEXT NOT NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  visit_type        TEXT NOT NULL DEFAULT 'monitoring'
                    CHECK (visit_type IN ('monitoring','verification','distribution','assessment','supervision')),
  officer_id        UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  visit_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  location          TEXT NOT NULL DEFAULT '',
  state             TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  participants_count INTEGER NOT NULL DEFAULT 0,
  female_count      INTEGER NOT NULL DEFAULT 0,
  male_count        INTEGER NOT NULL DEFAULT 0,
  findings          TEXT,
  recommendations   TEXT,
  status            TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('planned','completed','submitted','approved')),
  photo_count       INTEGER NOT NULL DEFAULT 0,
  synced_offline    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_field_visits_org ON public.field_visits (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_field_visits_demo ON public.field_visits (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_field_visits_updated ON public.field_visits;
CREATE TRIGGER trg_field_visits_updated
  BEFORE UPDATE ON public.field_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.volunteers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  skills         TEXT[],
  availability   TEXT,
  location       TEXT,
  joined_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  total_hours    NUMERIC(10,1) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('applicant','active','inactive')),
  rating         NUMERIC(3,1) NOT NULL DEFAULT 0,
  certifications TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_volunteers_org ON public.volunteers (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_volunteers_demo ON public.volunteers (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_volunteers_updated ON public.volunteers;
CREATE TRIGGER trg_volunteers_updated
  BEFORE UPDATE ON public.volunteers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  volunteer_id     UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  role_title       TEXT NOT NULL DEFAULT 'Volunteer',
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date         DATE,
  hours_logged     NUMERIC(10,1) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','completed','cancelled')),
  performance_note TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_org ON public.volunteer_assignments (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_demo ON public.volunteer_assignments (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_volunteer_assignments_updated ON public.volunteer_assignments;
CREATE TRIGGER trg_volunteer_assignments_updated
  BEFORE UPDATE ON public.volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  staff_no           TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  email              TEXT,
  phone              TEXT,
  gender             TEXT NOT NULL DEFAULT 'female' CHECK (gender IN ('female','male','other')),
  department_id      UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position           TEXT NOT NULL DEFAULT 'Officer',
  employment_type    TEXT NOT NULL DEFAULT 'full_time'
                     CHECK (employment_type IN ('full_time','part_time','contract','consultant','intern')),
  hire_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date          DATE,
  gross_salary_minor BIGINT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'NGN',
  project_id         UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  duty_station       TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','on_leave','suspended','exited')),
  supervisor_id      UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_demo ON public.employees (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type  TEXT NOT NULL DEFAULT 'annual'
              CHECK (leave_type IN ('annual','sick','maternity','paternity','compassionate','unpaid')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        NUMERIC(5,1) NOT NULL DEFAULT 1,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','cancelled')),
  approver_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON public.leave_requests (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_demo ON public.leave_requests (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_leave_requests_updated ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.training_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  audience             TEXT NOT NULL DEFAULT 'staff'
                       CHECK (audience IN ('staff','volunteer','partner','beneficiary')),
  training_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  facilitator          TEXT,
  location             TEXT,
  participants         INTEGER NOT NULL DEFAULT 0,
  female_participants  INTEGER NOT NULL DEFAULT 0,
  cost_minor           BIGINT NOT NULL DEFAULT 0,
  certification_issued BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_training_records_org ON public.training_records (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_records_demo ON public.training_records (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_training_records_updated ON public.training_records;
CREATE TRIGGER trg_training_records_updated
  BEFORE UPDATE ON public.training_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  partner_type      TEXT NOT NULL DEFAULT 'implementing'
                    CHECK (partner_type IN ('local','government','implementing','community','consultant','contractor','vendor')),
  contact_person    TEXT,
  email             TEXT,
  phone             TEXT,
  address           TEXT,
  country           TEXT NOT NULL DEFAULT 'Nigeria',
  agreement_ref     TEXT,
  agreement_start   DATE,
  agreement_end     DATE,
  capacity_score    INTEGER NOT NULL DEFAULT 0 CHECK (capacity_score BETWEEN 0 AND 100),
  compliance_status TEXT NOT NULL DEFAULT 'compliant'
                    CHECK (compliance_status IN ('compliant','pending_review','non_compliant')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  total_paid_minor  BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_partners_org ON public.partners (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partners_demo ON public.partners (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_partners_updated ON public.partners;
CREATE TRIGGER trg_partners_updated
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- #############################################################################
-- ## STEP 004 — Finance, operations, governance and system tables
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code         TEXT NOT NULL,
  name         TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'expense'
               CHECK (account_type IN ('asset','liability','equity','income','expense')),
  parent_code  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON public.accounts (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_demo ON public.accounts (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_accounts_updated ON public.accounts;
CREATE TRIGGER trg_accounts_updated
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.funds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  fund_type             TEXT NOT NULL DEFAULT 'restricted'
                        CHECK (fund_type IN ('restricted','unrestricted','temporarily_restricted','endowment')),
  donor_id              UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  grant_id              UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  balance_minor         BIGINT NOT NULL DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'NGN',
  restrictions          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_funds_org ON public.funds (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_funds_demo ON public.funds (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_funds_updated ON public.funds;
CREATE TRIGGER trg_funds_updated
  BEFORE UPDATE ON public.funds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  account_name   TEXT NOT NULL,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type   TEXT NOT NULL DEFAULT 'current',
  currency       TEXT NOT NULL DEFAULT 'NGN',
  balance_minor  BIGINT NOT NULL DEFAULT 0,
  fund_id        UUID REFERENCES public.funds(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON public.bank_accounts (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_demo ON public.bank_accounts (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_bank_accounts_updated ON public.bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  reference         TEXT NOT NULL,
  txn_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_type          TEXT NOT NULL DEFAULT 'expense'
                    CHECK (txn_type IN ('income','expense','transfer','adjustment','reversal')),
  account_code      TEXT NOT NULL DEFAULT '5000',
  fund_id           UUID REFERENCES public.funds(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id          UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  bank_account_id   UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  description       TEXT NOT NULL DEFAULT '',
  amount_minor      BIGINT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'NGN',
  exchange_rate     NUMERIC(14,6) NOT NULL DEFAULT 1,
  base_amount_minor BIGINT NOT NULL DEFAULT 0,
  payee             TEXT,
  payment_method    TEXT NOT NULL DEFAULT 'Bank Transfer',
  status            TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','reversed')),
  approved_by       UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_transactions_org ON public.transactions (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_demo ON public.transactions (org_id, is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (org_id, txn_date DESC) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_transactions_updated ON public.transactions;
CREATE TRIGGER trg_transactions_updated
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  project_id     UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  grant_id       UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  category       TEXT NOT NULL DEFAULT 'Programme Costs',
  line_item      TEXT NOT NULL,
  account_code   TEXT,
  budgeted_minor BIGINT NOT NULL DEFAULT 0,
  spent_minor    BIGINT NOT NULL DEFAULT 0,
  committed_minor BIGINT NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'NGN',
  period_label   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_org ON public.budget_lines (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_lines_demo ON public.budget_lines (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_budget_lines_updated ON public.budget_lines;
CREATE TRIGGER trg_budget_lines_updated
  BEFORE UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  reference       TEXT NOT NULL,
  title           TEXT NOT NULL,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  requester_id    UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  request_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  needed_by       DATE,
  estimated_minor BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  justification   TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending_approval','approved','rejected','ordered','received','closed')),
  approver_id     UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_org ON public.purchase_requests (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_requests_demo ON public.purchase_requests (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_purchase_requests_updated ON public.purchase_requests;
CREATE TRIGGER trg_purchase_requests_updated
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quotations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  request_id     UUID REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  partner_id     UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  vendor_name    TEXT NOT NULL,
  quote_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_minor   BIGINT NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'NGN',
  lead_time_days INTEGER NOT NULL DEFAULT 7,
  is_selected    BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_demo ON public.quotations (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_quotations_updated ON public.quotations;
CREATE TRIGGER trg_quotations_updated
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  reference     TEXT NOT NULL,
  request_id    UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  partner_id    UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_minor   BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'NGN',
  status        TEXT NOT NULL DEFAULT 'issued'
                CHECK (status IN ('issued','partially_received','received','cancelled')),
  invoice_ref   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON public.purchase_orders (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_demo ON public.purchase_orders (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name      TEXT NOT NULL,
  code      TEXT NOT NULL,
  location  TEXT,
  manager_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  capacity  TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_warehouses_org ON public.warehouses (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_demo ON public.warehouses (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_warehouses_updated ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  sku             TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Supplies',
  warehouse_id    UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  unit            TEXT NOT NULL DEFAULT 'piece',
  quantity        NUMERIC(14,2) NOT NULL DEFAULT 0,
  reorder_level   NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_cost_minor BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  expiry_date     DATE,
  is_consumable   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON public.inventory_items (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_demo ON public.inventory_items (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  item_id       UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'issue'
                CHECK (movement_type IN ('receipt','issue','transfer','adjustment','loss','distribution')),
  quantity      NUMERIC(14,2) NOT NULL DEFAULT 0,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  reference     TEXT,
  destination   TEXT,
  recorded_by   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON public.stock_movements (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_demo ON public.stock_movements (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_stock_movements_updated ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_updated
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  tag                 TEXT NOT NULL,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'equipment'
                      CHECK (category IN ('vehicle','equipment','computer','medical','furniture','other')),
  serial_number       TEXT,
  purchase_date       DATE,
  purchase_cost_minor BIGINT NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'NGN',
  donor_id            UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  project_id          UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  custodian_id        UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  location            TEXT,
  condition           TEXT NOT NULL DEFAULT 'good'
                      CHECK (condition IN ('new','good','fair','poor','unserviceable')),
  status              TEXT NOT NULL DEFAULT 'in_use'
                      CHECK (status IN ('in_use','in_store','maintenance','disposed','lost')),
  next_maintenance    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON public.assets (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_demo ON public.assets (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_assets_updated ON public.assets;
CREATE TRIGGER trg_assets_updated
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  plate_number        TEXT NOT NULL,
  vehicle_type        TEXT NOT NULL DEFAULT 'Pickup',
  make                TEXT NOT NULL DEFAULT '',
  model               TEXT NOT NULL DEFAULT '',
  year                INTEGER,
  fuel_type           TEXT NOT NULL DEFAULT 'Diesel',
  odometer_km         INTEGER NOT NULL DEFAULT 0,
  driver_id           UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  insurance_expiry    DATE,
  registration_expiry DATE,
  location            TEXT,
  status              TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','on_trip','maintenance','grounded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_demo ON public.vehicles (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_vehicles_updated ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  vehicle_id     UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id      UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  purpose        TEXT NOT NULL DEFAULT 'Field visit',
  origin         TEXT,
  destination    TEXT,
  departed_at    TIMESTAMPTZ,
  returned_at    TIMESTAMPTZ,
  distance_km    INTEGER NOT NULL DEFAULT 0,
  fuel_cost_minor BIGINT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'completed'
                 CHECK (status IN ('planned','in_progress','completed','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_trips_org ON public.trips (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_demo ON public.trips (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_trips_updated ON public.trips;
CREATE TRIGGER trg_trips_updated
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  asset_id         UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  vehicle_id       UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL DEFAULT 'routine'
                   CHECK (maintenance_type IN ('routine','repair','inspection','replacement')),
  service_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  provider         TEXT,
  description      TEXT,
  cost_minor       BIGINT NOT NULL DEFAULT 0,
  next_due         DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_org ON public.maintenance_records (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_records_demo ON public.maintenance_records (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_maintenance_records_updated ON public.maintenance_records;
CREATE TRIGGER trg_maintenance_records_updated
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.compliance_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'statutory'
                   CHECK (category IN ('registration','tax','license','certification','donor','statutory','audit')),
  authority        TEXT,
  reference_number TEXT,
  issue_date       DATE,
  expiry_date      DATE,
  status           TEXT NOT NULL DEFAULT 'valid'
                   CHECK (status IN ('valid','due_soon','expired','in_progress')),
  responsible_id   UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_compliance_items_org ON public.compliance_items (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_items_demo ON public.compliance_items (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_compliance_items_updated ON public.compliance_items;
CREATE TRIGGER trg_compliance_items_updated
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.board_meetings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  meeting_type    TEXT NOT NULL DEFAULT 'board'
                  CHECK (meeting_type IN ('board','agm','committee','management','emergency')),
  meeting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  location        TEXT,
  chairperson     TEXT,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  quorum_met      BOOLEAN NOT NULL DEFAULT true,
  agenda          TEXT,
  minutes         TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','held','cancelled','minuted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_board_meetings_org ON public.board_meetings (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_board_meetings_demo ON public.board_meetings (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_board_meetings_updated ON public.board_meetings;
CREATE TRIGGER trg_board_meetings_updated
  BEFORE UPDATE ON public.board_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.board_resolutions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  meeting_id     UUID REFERENCES public.board_meetings(id) ON DELETE CASCADE,
  reference      TEXT NOT NULL,
  title          TEXT NOT NULL,
  resolution     TEXT NOT NULL,
  passed_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  votes_for      INTEGER NOT NULL DEFAULT 0,
  votes_against  INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'passed'
                 CHECK (status IN ('passed','rejected','deferred','implemented')),
  responsible_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_board_resolutions_org ON public.board_resolutions (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_board_resolutions_demo ON public.board_resolutions (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_board_resolutions_updated ON public.board_resolutions;
CREATE TRIGGER trg_board_resolutions_updated
  BEFORE UPDATE ON public.board_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'Governance',
  version        TEXT NOT NULL DEFAULT 'v1.0',
  effective_date DATE,
  review_date    DATE,
  owner_id       UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  content        TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('draft','active','under_review','retired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_policies_org ON public.policies (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policies_demo ON public.policies (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_policies_updated ON public.policies;
CREATE TRIGGER trg_policies_updated
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  doc_type          TEXT NOT NULL DEFAULT 'Report',
  category          TEXT NOT NULL DEFAULT 'General',
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id          UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  parent_id         UUID,
  file_path         TEXT,
  file_size         BIGINT NOT NULL DEFAULT 0,
  mime_type         TEXT,
  content           TEXT,
  access_level      TEXT NOT NULL DEFAULT 'internal'
                    CHECK (access_level IN ('public','internal','restricted','confidential')),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','final','signed','archived')),
  verification_code TEXT,
  ai_generated      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_demo ON public.documents (org_id, is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_documents_verification ON public.documents (verification_code) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  event_type  TEXT NOT NULL DEFAULT 'meeting'
              CHECK (event_type IN ('meeting','deadline','field_visit','report_due','training','holiday','other')),
  start_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at      TIMESTAMPTZ,
  all_day     BOOLEAN NOT NULL DEFAULT false,
  location    TEXT,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id    UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  description TEXT,
  reminder_minutes INTEGER NOT NULL DEFAULT 60,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON public.calendar_events (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_demo ON public.calendar_events (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_calendar_events_updated ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  category   TEXT NOT NULL DEFAULT 'system',
  severity   TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','danger')),
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_demo ON public.notifications (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_notifications_updated ON public.notifications;
CREATE TRIGGER trg_notifications_updated
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  module      TEXT NOT NULL DEFAULT 'procurement',
  trigger_on  TEXT NOT NULL DEFAULT 'create',
  steps       JSONB NOT NULL DEFAULT '[]'::jsonb,
  threshold_minor BIGINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org ON public.workflow_definitions (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_demo ON public.workflow_definitions (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_workflow_definitions_updated ON public.workflow_definitions;
CREATE TRIGGER trg_workflow_definitions_updated
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  definition_id UUID REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  record_table  TEXT NOT NULL,
  record_id     UUID NOT NULL,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','cancelled')),
  history       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_org ON public.workflow_instances (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_demo ON public.workflow_instances (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_workflow_instances_updated ON public.workflow_instances;
CREATE TRIGGER trg_workflow_instances_updated
  BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  flag_key    TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON public.feature_flags (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_demo ON public.feature_flags (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_feature_flags_updated ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Default',
  widgets     JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_org ON public.dashboard_layouts (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_demo ON public.dashboard_layouts (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_dashboard_layouts_updated ON public.dashboard_layouts;
CREATE TRIGGER trg_dashboard_layouts_updated
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_configurations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  provider        TEXT NOT NULL DEFAULT 'groq',
  default_model   TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.40,
  max_tokens      INTEGER NOT NULL DEFAULT 2048,
  monthly_limit   INTEGER NOT NULL DEFAULT 5000,
  requests_used   INTEGER NOT NULL DEFAULT 0,
  model_routing   JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_configurations_org ON public.ai_configurations (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_configurations_demo ON public.ai_configurations (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_ai_configurations_updated ON public.ai_configurations;
CREATE TRIGGER trg_ai_configurations_updated
  BEFORE UPDATE ON public.ai_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  module       TEXT NOT NULL DEFAULT 'dashboard',
  intent       TEXT NOT NULL DEFAULT 'chat',
  model        TEXT,
  prompt_chars INTEGER NOT NULL DEFAULT 0,
  output_chars INTEGER NOT NULL DEFAULT 0,
  latency_ms   INTEGER NOT NULL DEFAULT 0,
  succeeded    BOOLEAN NOT NULL DEFAULT true,
  error_text   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_org ON public.ai_audit_logs (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_demo ON public.ai_audit_logs (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_ai_audit_logs_updated ON public.ai_audit_logs;
CREATE TRIGGER trg_ai_audit_logs_updated
  BEFORE UPDATE ON public.ai_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_memory_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  scope      TEXT NOT NULL DEFAULT 'organization',
  memory_key TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_entries_org ON public.ai_memory_entries (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_memory_entries_demo ON public.ai_memory_entries (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_ai_memory_entries_updated ON public.ai_memory_entries;
CREATE TRIGGER trg_ai_memory_entries_updated
  BEFORE UPDATE ON public.ai_memory_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  module      TEXT NOT NULL DEFAULT 'reports',
  intent      TEXT NOT NULL DEFAULT 'draft',
  template    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_org ON public.ai_prompt_templates (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_demo ON public.ai_prompt_templates (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_ai_prompt_templates_updated ON public.ai_prompt_templates;
CREATE TRIGGER trg_ai_prompt_templates_updated
  BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.communication_providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  channel      TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  provider     TEXT NOT NULL,
  from_address TEXT,
  config       JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_communication_providers_org ON public.communication_providers (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_providers_demo ON public.communication_providers (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_communication_providers_updated ON public.communication_providers;
CREATE TRIGGER trg_communication_providers_updated
  BEFORE UPDATE ON public.communication_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  subject    TEXT,
  body       TEXT NOT NULL,
  variables  TEXT[],
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_communication_templates_org ON public.communication_templates (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_templates_demo ON public.communication_templates (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_communication_templates_updated ON public.communication_templates;
CREATE TRIGGER trg_communication_templates_updated
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.message_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  channel     TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  provider    TEXT,
  recipient   TEXT NOT NULL,
  subject     TEXT,
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','delivered','failed','bounced')),
  error_text  TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_message_logs_org ON public.message_logs (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_message_logs_demo ON public.message_logs (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_message_logs_updated ON public.message_logs;
CREATE TRIGGER trg_message_logs_updated
  BEFORE UPDATE ON public.message_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  key_prefix    TEXT NOT NULL,
  key_hash      TEXT NOT NULL,
  scopes        TEXT[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit    INTEGER NOT NULL DEFAULT 1000,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_demo ON public.api_keys (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_api_keys_updated ON public.api_keys;
CREATE TRIGGER trg_api_keys_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  target_url  TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT ARRAY['project.created'],
  secret      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_status INTEGER,
  failures    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_demo ON public.webhooks (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_webhooks_updated ON public.webhooks;
CREATE TRIGGER trg_webhooks_updated
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.backup_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  backup_type TEXT NOT NULL DEFAULT 'scheduled'
              CHECK (backup_type IN ('scheduled','manual','pre_upgrade')),
  size_bytes  BIGINT NOT NULL DEFAULT 0,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'success'
              CHECK (status IN ('running','success','failed')),
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_backup_records_org ON public.backup_records (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_backup_records_demo ON public.backup_records (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_backup_records_updated ON public.backup_records;
CREATE TRIGGER trg_backup_records_updated
  BEFORE UPDATE ON public.backup_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.job_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  job_key    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('running','success','failed')),
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  message    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID,
  is_demo     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_job_runs_org ON public.job_runs (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_runs_demo ON public.job_runs (org_id, is_demo) WHERE is_demo = true;

DROP TRIGGER IF EXISTS trg_job_runs_updated ON public.job_runs;
CREATE TRIGGER trg_job_runs_updated
  BEFORE UPDATE ON public.job_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      UUID,
  user_name    TEXT NOT NULL DEFAULT 'System',
  user_role    TEXT NOT NULL DEFAULT 'system',
  action       TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','VIEW')),
  module       TEXT NOT NULL DEFAULT 'system',
  record_table TEXT,
  record_id    UUID,
  record_label TEXT,
  changes      JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs (record_table, record_id);


-- #############################################################################
-- ## STEP 005 — Row level security on every table
-- #############################################################################

-- -----------------------------------------------------------------------------
-- organizations — the tenant root
-- -----------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id());

DROP POLICY IF EXISTS organizations_insert ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS organizations_update ON public.organizations;
CREATE POLICY organizations_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.is_admin())
  WITH CHECK (id = public.current_org_id());

DROP POLICY IF EXISTS organizations_delete ON public.organizations;
CREATE POLICY organizations_delete ON public.organizations
  FOR DELETE TO authenticated
  USING (id = public.current_org_id() AND public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- app_users — identity. A user can always read their own row, which is what
-- allows current_org_id() to resolve on first request.
-- -----------------------------------------------------------------------------

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_select ON public.app_users;
CREATE POLICY app_users_select ON public.app_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR org_id = public.current_org_id());

DROP POLICY IF EXISTS app_users_insert ON public.app_users;
CREATE POLICY app_users_insert ON public.app_users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR (org_id = public.current_org_id() AND public.is_admin()));

DROP POLICY IF EXISTS app_users_update ON public.app_users;
CREATE POLICY app_users_update ON public.app_users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR (org_id = public.current_org_id() AND public.is_admin()))
  WITH CHECK (auth_user_id = auth.uid() OR org_id = public.current_org_id());

DROP POLICY IF EXISTS app_users_delete ON public.app_users;
CREATE POLICY app_users_delete ON public.app_users
  FOR DELETE TO authenticated
  USING (org_id = public.current_org_id() AND public.is_admin());

-- -----------------------------------------------------------------------------
-- audit_logs — append-only. No UPDATE or DELETE policy is defined, so those
-- operations are refused for every role subject to RLS.
-- -----------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND public.is_manager());

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- Standard org-scoped tables
--
--   SELECT  any member of the organization
--   INSERT  staff and above
--   UPDATE  staff and above
--   DELETE  managers and above (the application soft-deletes; this is a backstop)
-- -----------------------------------------------------------------------------

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select ON public.accounts;
CREATE POLICY accounts_select ON public.accounts
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS accounts_insert ON public.accounts;
CREATE POLICY accounts_insert ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS accounts_update ON public.accounts;
CREATE POLICY accounts_update ON public.accounts
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS accounts_delete ON public.accounts;
CREATE POLICY accounts_delete ON public.accounts
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_audit_logs_select ON public.ai_audit_logs;
CREATE POLICY ai_audit_logs_select ON public.ai_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_audit_logs_insert ON public.ai_audit_logs;
CREATE POLICY ai_audit_logs_insert ON public.ai_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS ai_audit_logs_update ON public.ai_audit_logs;
CREATE POLICY ai_audit_logs_update ON public.ai_audit_logs
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_audit_logs_delete ON public.ai_audit_logs;
CREATE POLICY ai_audit_logs_delete ON public.ai_audit_logs
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configurations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_configurations_select ON public.ai_configurations;
CREATE POLICY ai_configurations_select ON public.ai_configurations
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_configurations_insert ON public.ai_configurations;
CREATE POLICY ai_configurations_insert ON public.ai_configurations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS ai_configurations_update ON public.ai_configurations;
CREATE POLICY ai_configurations_update ON public.ai_configurations
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_configurations_delete ON public.ai_configurations;
CREATE POLICY ai_configurations_delete ON public.ai_configurations
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.ai_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_memory_entries_select ON public.ai_memory_entries;
CREATE POLICY ai_memory_entries_select ON public.ai_memory_entries
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_memory_entries_insert ON public.ai_memory_entries;
CREATE POLICY ai_memory_entries_insert ON public.ai_memory_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS ai_memory_entries_update ON public.ai_memory_entries;
CREATE POLICY ai_memory_entries_update ON public.ai_memory_entries
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_memory_entries_delete ON public.ai_memory_entries;
CREATE POLICY ai_memory_entries_delete ON public.ai_memory_entries
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_prompt_templates_select ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_select ON public.ai_prompt_templates
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_prompt_templates_insert ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_insert ON public.ai_prompt_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS ai_prompt_templates_update ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_update ON public.ai_prompt_templates
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS ai_prompt_templates_delete ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_delete ON public.ai_prompt_templates
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_select ON public.api_keys;
CREATE POLICY api_keys_select ON public.api_keys
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS api_keys_insert ON public.api_keys;
CREATE POLICY api_keys_insert ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS api_keys_update ON public.api_keys;
CREATE POLICY api_keys_update ON public.api_keys
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS api_keys_delete ON public.api_keys;
CREATE POLICY api_keys_delete ON public.api_keys
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_select ON public.assets;
CREATE POLICY assets_select ON public.assets
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS assets_insert ON public.assets;
CREATE POLICY assets_insert ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS assets_update ON public.assets;
CREATE POLICY assets_update ON public.assets
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS assets_delete ON public.assets;
CREATE POLICY assets_delete ON public.assets
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backup_records_select ON public.backup_records;
CREATE POLICY backup_records_select ON public.backup_records
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS backup_records_insert ON public.backup_records;
CREATE POLICY backup_records_insert ON public.backup_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS backup_records_update ON public.backup_records;
CREATE POLICY backup_records_update ON public.backup_records
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS backup_records_delete ON public.backup_records;
CREATE POLICY backup_records_delete ON public.backup_records
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_select ON public.bank_accounts;
CREATE POLICY bank_accounts_select ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS bank_accounts_insert ON public.bank_accounts;
CREATE POLICY bank_accounts_insert ON public.bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS bank_accounts_update ON public.bank_accounts;
CREATE POLICY bank_accounts_update ON public.bank_accounts
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS bank_accounts_delete ON public.bank_accounts;
CREATE POLICY bank_accounts_delete ON public.bank_accounts
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beneficiaries_select ON public.beneficiaries;
CREATE POLICY beneficiaries_select ON public.beneficiaries
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS beneficiaries_insert ON public.beneficiaries;
CREATE POLICY beneficiaries_insert ON public.beneficiaries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS beneficiaries_update ON public.beneficiaries;
CREATE POLICY beneficiaries_update ON public.beneficiaries
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS beneficiaries_delete ON public.beneficiaries;
CREATE POLICY beneficiaries_delete ON public.beneficiaries
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meetings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_meetings_select ON public.board_meetings;
CREATE POLICY board_meetings_select ON public.board_meetings
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_meetings_insert ON public.board_meetings;
CREATE POLICY board_meetings_insert ON public.board_meetings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS board_meetings_update ON public.board_meetings;
CREATE POLICY board_meetings_update ON public.board_meetings
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_meetings_delete ON public.board_meetings;
CREATE POLICY board_meetings_delete ON public.board_meetings
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_members_select ON public.board_members;
CREATE POLICY board_members_select ON public.board_members
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_members_insert ON public.board_members;
CREATE POLICY board_members_insert ON public.board_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS board_members_update ON public.board_members;
CREATE POLICY board_members_update ON public.board_members
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_members_delete ON public.board_members;
CREATE POLICY board_members_delete ON public.board_members
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.board_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_resolutions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_resolutions_select ON public.board_resolutions;
CREATE POLICY board_resolutions_select ON public.board_resolutions
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_resolutions_insert ON public.board_resolutions;
CREATE POLICY board_resolutions_insert ON public.board_resolutions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS board_resolutions_update ON public.board_resolutions;
CREATE POLICY board_resolutions_update ON public.board_resolutions
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS board_resolutions_delete ON public.board_resolutions;
CREATE POLICY board_resolutions_delete ON public.board_resolutions
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_select ON public.branches;
CREATE POLICY branches_select ON public.branches
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS branches_insert ON public.branches;
CREATE POLICY branches_insert ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS branches_update ON public.branches;
CREATE POLICY branches_update ON public.branches
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS branches_delete ON public.branches;
CREATE POLICY branches_delete ON public.branches
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_lines_select ON public.budget_lines;
CREATE POLICY budget_lines_select ON public.budget_lines
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS budget_lines_insert ON public.budget_lines;
CREATE POLICY budget_lines_insert ON public.budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS budget_lines_update ON public.budget_lines;
CREATE POLICY budget_lines_update ON public.budget_lines
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS budget_lines_delete ON public.budget_lines;
CREATE POLICY budget_lines_delete ON public.budget_lines
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete ON public.calendar_events
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_select ON public.campaigns;
CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS campaigns_insert ON public.campaigns;
CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS campaigns_update ON public.campaigns;
CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS campaigns_delete ON public.campaigns;
CREATE POLICY campaigns_delete ON public.campaigns
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_files_select ON public.case_files;
CREATE POLICY case_files_select ON public.case_files
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS case_files_insert ON public.case_files;
CREATE POLICY case_files_insert ON public.case_files
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS case_files_update ON public.case_files;
CREATE POLICY case_files_update ON public.case_files
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS case_files_delete ON public.case_files;
CREATE POLICY case_files_delete ON public.case_files
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_notes_select ON public.case_notes;
CREATE POLICY case_notes_select ON public.case_notes
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS case_notes_insert ON public.case_notes;
CREATE POLICY case_notes_insert ON public.case_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS case_notes_update ON public.case_notes;
CREATE POLICY case_notes_update ON public.case_notes
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS case_notes_delete ON public.case_notes;
CREATE POLICY case_notes_delete ON public.case_notes
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.communication_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_providers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communication_providers_select ON public.communication_providers;
CREATE POLICY communication_providers_select ON public.communication_providers
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS communication_providers_insert ON public.communication_providers;
CREATE POLICY communication_providers_insert ON public.communication_providers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS communication_providers_update ON public.communication_providers;
CREATE POLICY communication_providers_update ON public.communication_providers
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS communication_providers_delete ON public.communication_providers;
CREATE POLICY communication_providers_delete ON public.communication_providers
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communication_templates_select ON public.communication_templates;
CREATE POLICY communication_templates_select ON public.communication_templates
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS communication_templates_insert ON public.communication_templates;
CREATE POLICY communication_templates_insert ON public.communication_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS communication_templates_update ON public.communication_templates;
CREATE POLICY communication_templates_update ON public.communication_templates
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS communication_templates_delete ON public.communication_templates;
CREATE POLICY communication_templates_delete ON public.communication_templates
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compliance_items_select ON public.compliance_items;
CREATE POLICY compliance_items_select ON public.compliance_items
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS compliance_items_insert ON public.compliance_items;
CREATE POLICY compliance_items_insert ON public.compliance_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS compliance_items_update ON public.compliance_items;
CREATE POLICY compliance_items_update ON public.compliance_items
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS compliance_items_delete ON public.compliance_items;
CREATE POLICY compliance_items_delete ON public.compliance_items
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_layouts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_layouts_select ON public.dashboard_layouts;
CREATE POLICY dashboard_layouts_select ON public.dashboard_layouts
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS dashboard_layouts_insert ON public.dashboard_layouts;
CREATE POLICY dashboard_layouts_insert ON public.dashboard_layouts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS dashboard_layouts_update ON public.dashboard_layouts;
CREATE POLICY dashboard_layouts_update ON public.dashboard_layouts
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS dashboard_layouts_delete ON public.dashboard_layouts;
CREATE POLICY dashboard_layouts_delete ON public.dashboard_layouts
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_select ON public.departments;
CREATE POLICY departments_select ON public.departments
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS departments_insert ON public.departments;
CREATE POLICY departments_insert ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS departments_update ON public.departments;
CREATE POLICY departments_update ON public.departments
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS departments_delete ON public.departments;
CREATE POLICY departments_delete ON public.departments
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donations_select ON public.donations;
CREATE POLICY donations_select ON public.donations
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS donations_insert ON public.donations;
CREATE POLICY donations_insert ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS donations_update ON public.donations;
CREATE POLICY donations_update ON public.donations
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS donations_delete ON public.donations;
CREATE POLICY donations_delete ON public.donations
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donors_select ON public.donors;
CREATE POLICY donors_select ON public.donors
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS donors_insert ON public.donors;
CREATE POLICY donors_insert ON public.donors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS donors_update ON public.donors;
CREATE POLICY donors_update ON public.donors
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS donors_delete ON public.donors;
CREATE POLICY donors_delete ON public.donors
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete ON public.employees
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
CREATE POLICY enrollments_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
CREATE POLICY enrollments_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS enrollments_update ON public.enrollments;
CREATE POLICY enrollments_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS enrollments_delete ON public.enrollments;
CREATE POLICY enrollments_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evaluations_select ON public.evaluations;
CREATE POLICY evaluations_select ON public.evaluations
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS evaluations_insert ON public.evaluations;
CREATE POLICY evaluations_insert ON public.evaluations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS evaluations_update ON public.evaluations;
CREATE POLICY evaluations_update ON public.evaluations
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS evaluations_delete ON public.evaluations;
CREATE POLICY evaluations_delete ON public.evaluations
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;
CREATE POLICY feature_flags_select ON public.feature_flags
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS feature_flags_insert ON public.feature_flags;
CREATE POLICY feature_flags_insert ON public.feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS feature_flags_update ON public.feature_flags;
CREATE POLICY feature_flags_update ON public.feature_flags
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS feature_flags_delete ON public.feature_flags;
CREATE POLICY feature_flags_delete ON public.feature_flags
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_visits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_visits_select ON public.field_visits;
CREATE POLICY field_visits_select ON public.field_visits
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS field_visits_insert ON public.field_visits;
CREATE POLICY field_visits_insert ON public.field_visits
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS field_visits_update ON public.field_visits;
CREATE POLICY field_visits_update ON public.field_visits
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS field_visits_delete ON public.field_visits;
CREATE POLICY field_visits_delete ON public.field_visits
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funds_select ON public.funds;
CREATE POLICY funds_select ON public.funds
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS funds_insert ON public.funds;
CREATE POLICY funds_insert ON public.funds
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS funds_update ON public.funds;
CREATE POLICY funds_update ON public.funds
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS funds_delete ON public.funds;
CREATE POLICY funds_delete ON public.funds
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.grant_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_disbursements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grant_disbursements_select ON public.grant_disbursements;
CREATE POLICY grant_disbursements_select ON public.grant_disbursements
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS grant_disbursements_insert ON public.grant_disbursements;
CREATE POLICY grant_disbursements_insert ON public.grant_disbursements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS grant_disbursements_update ON public.grant_disbursements;
CREATE POLICY grant_disbursements_update ON public.grant_disbursements
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS grant_disbursements_delete ON public.grant_disbursements;
CREATE POLICY grant_disbursements_delete ON public.grant_disbursements
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.grant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grant_reports_select ON public.grant_reports;
CREATE POLICY grant_reports_select ON public.grant_reports
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS grant_reports_insert ON public.grant_reports;
CREATE POLICY grant_reports_insert ON public.grant_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS grant_reports_update ON public.grant_reports;
CREATE POLICY grant_reports_update ON public.grant_reports
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS grant_reports_delete ON public.grant_reports;
CREATE POLICY grant_reports_delete ON public.grant_reports
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grants_select ON public.grants;
CREATE POLICY grants_select ON public.grants
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS grants_insert ON public.grants;
CREATE POLICY grants_insert ON public.grants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS grants_update ON public.grants;
CREATE POLICY grants_update ON public.grants
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS grants_delete ON public.grants;
CREATE POLICY grants_delete ON public.grants
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS households_select ON public.households;
CREATE POLICY households_select ON public.households
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS households_insert ON public.households;
CREATE POLICY households_insert ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS households_update ON public.households;
CREATE POLICY households_update ON public.households
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS households_delete ON public.households;
CREATE POLICY households_delete ON public.households
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.indicator_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_results FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS indicator_results_select ON public.indicator_results;
CREATE POLICY indicator_results_select ON public.indicator_results
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS indicator_results_insert ON public.indicator_results;
CREATE POLICY indicator_results_insert ON public.indicator_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS indicator_results_update ON public.indicator_results;
CREATE POLICY indicator_results_update ON public.indicator_results
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS indicator_results_delete ON public.indicator_results;
CREATE POLICY indicator_results_delete ON public.indicator_results
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS indicators_select ON public.indicators;
CREATE POLICY indicators_select ON public.indicators
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS indicators_insert ON public.indicators;
CREATE POLICY indicators_insert ON public.indicators
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS indicators_update ON public.indicators;
CREATE POLICY indicators_update ON public.indicators
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS indicators_delete ON public.indicators;
CREATE POLICY indicators_delete ON public.indicators
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_select ON public.inventory_items;
CREATE POLICY inventory_items_select ON public.inventory_items
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS inventory_items_insert ON public.inventory_items;
CREATE POLICY inventory_items_insert ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS inventory_items_update ON public.inventory_items;
CREATE POLICY inventory_items_update ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS inventory_items_delete ON public.inventory_items;
CREATE POLICY inventory_items_delete ON public.inventory_items
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_runs_select ON public.job_runs;
CREATE POLICY job_runs_select ON public.job_runs
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS job_runs_insert ON public.job_runs;
CREATE POLICY job_runs_insert ON public.job_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS job_runs_update ON public.job_runs;
CREATE POLICY job_runs_update ON public.job_runs
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS job_runs_delete ON public.job_runs;
CREATE POLICY job_runs_delete ON public.job_runs
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.learning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_entries_select ON public.learning_entries;
CREATE POLICY learning_entries_select ON public.learning_entries
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS learning_entries_insert ON public.learning_entries;
CREATE POLICY learning_entries_insert ON public.learning_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS learning_entries_update ON public.learning_entries;
CREATE POLICY learning_entries_update ON public.learning_entries
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS learning_entries_delete ON public.learning_entries;
CREATE POLICY learning_entries_delete ON public.learning_entries
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_requests_select ON public.leave_requests;
CREATE POLICY leave_requests_select ON public.leave_requests
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS leave_requests_insert ON public.leave_requests;
CREATE POLICY leave_requests_insert ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS leave_requests_update ON public.leave_requests;
CREATE POLICY leave_requests_update ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS leave_requests_delete ON public.leave_requests;
CREATE POLICY leave_requests_delete ON public.leave_requests
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.logframe_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logframe_rows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logframe_rows_select ON public.logframe_rows;
CREATE POLICY logframe_rows_select ON public.logframe_rows
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS logframe_rows_insert ON public.logframe_rows;
CREATE POLICY logframe_rows_insert ON public.logframe_rows
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS logframe_rows_update ON public.logframe_rows;
CREATE POLICY logframe_rows_update ON public.logframe_rows
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS logframe_rows_delete ON public.logframe_rows;
CREATE POLICY logframe_rows_delete ON public.logframe_rows
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_records_select ON public.maintenance_records;
CREATE POLICY maintenance_records_select ON public.maintenance_records
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS maintenance_records_insert ON public.maintenance_records;
CREATE POLICY maintenance_records_insert ON public.maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS maintenance_records_update ON public.maintenance_records;
CREATE POLICY maintenance_records_update ON public.maintenance_records
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS maintenance_records_delete ON public.maintenance_records;
CREATE POLICY maintenance_records_delete ON public.maintenance_records
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_logs_select ON public.message_logs;
CREATE POLICY message_logs_select ON public.message_logs
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS message_logs_insert ON public.message_logs;
CREATE POLICY message_logs_insert ON public.message_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS message_logs_update ON public.message_logs;
CREATE POLICY message_logs_update ON public.message_logs
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS message_logs_delete ON public.message_logs;
CREATE POLICY message_logs_delete ON public.message_logs
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partners_select ON public.partners;
CREATE POLICY partners_select ON public.partners
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS partners_insert ON public.partners;
CREATE POLICY partners_insert ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS partners_update ON public.partners;
CREATE POLICY partners_update ON public.partners
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS partners_delete ON public.partners;
CREATE POLICY partners_delete ON public.partners
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policies_select ON public.policies;
CREATE POLICY policies_select ON public.policies
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS policies_insert ON public.policies;
CREATE POLICY policies_insert ON public.policies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS policies_update ON public.policies;
CREATE POLICY policies_update ON public.policies
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS policies_delete ON public.policies;
CREATE POLICY policies_delete ON public.policies
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS programs_select ON public.programs;
CREATE POLICY programs_select ON public.programs
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS programs_insert ON public.programs;
CREATE POLICY programs_insert ON public.programs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS programs_update ON public.programs;
CREATE POLICY programs_update ON public.programs
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS programs_delete ON public.programs;
CREATE POLICY programs_delete ON public.programs
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_activities_select ON public.project_activities;
CREATE POLICY project_activities_select ON public.project_activities
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_activities_insert ON public.project_activities;
CREATE POLICY project_activities_insert ON public.project_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS project_activities_update ON public.project_activities;
CREATE POLICY project_activities_update ON public.project_activities
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_activities_delete ON public.project_activities;
CREATE POLICY project_activities_delete ON public.project_activities
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_risks_select ON public.project_risks;
CREATE POLICY project_risks_select ON public.project_risks
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_risks_insert ON public.project_risks;
CREATE POLICY project_risks_insert ON public.project_risks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS project_risks_update ON public.project_risks;
CREATE POLICY project_risks_update ON public.project_risks
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_risks_delete ON public.project_risks;
CREATE POLICY project_risks_delete ON public.project_risks
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_team_select ON public.project_team;
CREATE POLICY project_team_select ON public.project_team
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_team_insert ON public.project_team;
CREATE POLICY project_team_insert ON public.project_team
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS project_team_update ON public.project_team;
CREATE POLICY project_team_update ON public.project_team
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS project_team_delete ON public.project_team;
CREATE POLICY project_team_delete ON public.project_team
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_orders_select ON public.purchase_orders;
CREATE POLICY purchase_orders_select ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS purchase_orders_insert ON public.purchase_orders;
CREATE POLICY purchase_orders_insert ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS purchase_orders_update ON public.purchase_orders;
CREATE POLICY purchase_orders_update ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS purchase_orders_delete ON public.purchase_orders;
CREATE POLICY purchase_orders_delete ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_requests_select ON public.purchase_requests;
CREATE POLICY purchase_requests_select ON public.purchase_requests
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS purchase_requests_insert ON public.purchase_requests;
CREATE POLICY purchase_requests_insert ON public.purchase_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS purchase_requests_update ON public.purchase_requests;
CREATE POLICY purchase_requests_update ON public.purchase_requests
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS purchase_requests_delete ON public.purchase_requests;
CREATE POLICY purchase_requests_delete ON public.purchase_requests
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotations_select ON public.quotations;
CREATE POLICY quotations_select ON public.quotations
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS quotations_insert ON public.quotations;
CREATE POLICY quotations_insert ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS quotations_update ON public.quotations;
CREATE POLICY quotations_update ON public.quotations
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS quotations_delete ON public.quotations;
CREATE POLICY quotations_delete ON public.quotations
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_records_select ON public.service_records;
CREATE POLICY service_records_select ON public.service_records
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS service_records_insert ON public.service_records;
CREATE POLICY service_records_insert ON public.service_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS service_records_update ON public.service_records;
CREATE POLICY service_records_update ON public.service_records
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS service_records_delete ON public.service_records;
CREATE POLICY service_records_delete ON public.service_records
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
CREATE POLICY stock_movements_select ON public.stock_movements
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS stock_movements_insert ON public.stock_movements;
CREATE POLICY stock_movements_insert ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS stock_movements_update ON public.stock_movements;
CREATE POLICY stock_movements_update ON public.stock_movements
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS stock_movements_delete ON public.stock_movements;
CREATE POLICY stock_movements_delete ON public.stock_movements
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_records_select ON public.training_records;
CREATE POLICY training_records_select ON public.training_records
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS training_records_insert ON public.training_records;
CREATE POLICY training_records_insert ON public.training_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS training_records_update ON public.training_records;
CREATE POLICY training_records_update ON public.training_records
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS training_records_delete ON public.training_records;
CREATE POLICY training_records_delete ON public.training_records
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_select ON public.transactions;
CREATE POLICY transactions_select ON public.transactions
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS transactions_delete ON public.transactions;
CREATE POLICY transactions_delete ON public.transactions
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trips_select ON public.trips;
CREATE POLICY trips_select ON public.trips
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS trips_insert ON public.trips;
CREATE POLICY trips_insert ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS trips_update ON public.trips;
CREATE POLICY trips_update ON public.trips
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS trips_delete ON public.trips;
CREATE POLICY trips_delete ON public.trips
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_select ON public.vehicles;
CREATE POLICY vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS vehicles_insert ON public.vehicles;
CREATE POLICY vehicles_insert ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS vehicles_update ON public.vehicles;
CREATE POLICY vehicles_update ON public.vehicles
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS vehicles_delete ON public.vehicles;
CREATE POLICY vehicles_delete ON public.vehicles
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_assignments_select ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_select ON public.volunteer_assignments
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS volunteer_assignments_insert ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_insert ON public.volunteer_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS volunteer_assignments_update ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_update ON public.volunteer_assignments
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS volunteer_assignments_delete ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_delete ON public.volunteer_assignments
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteers_select ON public.volunteers;
CREATE POLICY volunteers_select ON public.volunteers
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS volunteers_insert ON public.volunteers;
CREATE POLICY volunteers_insert ON public.volunteers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS volunteers_update ON public.volunteers;
CREATE POLICY volunteers_update ON public.volunteers
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS volunteers_delete ON public.volunteers;
CREATE POLICY volunteers_delete ON public.volunteers
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouses_select ON public.warehouses;
CREATE POLICY warehouses_select ON public.warehouses
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS warehouses_insert ON public.warehouses;
CREATE POLICY warehouses_insert ON public.warehouses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS warehouses_update ON public.warehouses;
CREATE POLICY warehouses_update ON public.warehouses
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS warehouses_delete ON public.warehouses;
CREATE POLICY warehouses_delete ON public.warehouses
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_select ON public.webhooks;
CREATE POLICY webhooks_select ON public.webhooks
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS webhooks_insert ON public.webhooks;
CREATE POLICY webhooks_insert ON public.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS webhooks_update ON public.webhooks;
CREATE POLICY webhooks_update ON public.webhooks
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS webhooks_delete ON public.webhooks;
CREATE POLICY webhooks_delete ON public.webhooks
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_definitions_select ON public.workflow_definitions;
CREATE POLICY workflow_definitions_select ON public.workflow_definitions
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS workflow_definitions_insert ON public.workflow_definitions;
CREATE POLICY workflow_definitions_insert ON public.workflow_definitions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS workflow_definitions_update ON public.workflow_definitions;
CREATE POLICY workflow_definitions_update ON public.workflow_definitions
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS workflow_definitions_delete ON public.workflow_definitions;
CREATE POLICY workflow_definitions_delete ON public.workflow_definitions
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_instances_select ON public.workflow_instances;
CREATE POLICY workflow_instances_select ON public.workflow_instances
  FOR SELECT TO authenticated
  USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS workflow_instances_insert ON public.workflow_instances;
CREATE POLICY workflow_instances_insert ON public.workflow_instances
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(org_id) AND public.can_write());

DROP POLICY IF EXISTS workflow_instances_update ON public.workflow_instances;
CREATE POLICY workflow_instances_update ON public.workflow_instances
  FOR UPDATE TO authenticated
  USING (public.is_member_of(org_id) AND public.can_write())
  WITH CHECK (public.is_member_of(org_id));

DROP POLICY IF EXISTS workflow_instances_delete ON public.workflow_instances;
CREATE POLICY workflow_instances_delete ON public.workflow_instances
  FOR DELETE TO authenticated
  USING (public.is_member_of(org_id) AND public.is_manager());

-- -----------------------------------------------------------------------------
-- Grants to Supabase roles
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- #############################################################################
-- ## STEP 006 — Reference data and organization defaults
-- #############################################################################

-- -----------------------------------------------------------------------------
-- Uniqueness guards so the seeds below can use ON CONFLICT
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_org_code
  ON public.accounts (org_id, code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_org_key
  ON public.feature_flags (org_id, flag_key) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_funds_org_code
  ON public.funds (org_id, code) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Seeding function — applied to one organization
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_organization_defaults(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chart of accounts aligned to nonprofit fund accounting -------------------
  INSERT INTO public.accounts (org_id, code, name, account_type)
  VALUES
    (target_org, '1000', 'Cash and Bank',                    'asset'),
    (target_org, '1100', 'Petty Cash',                       'asset'),
    (target_org, '1200', 'Grants Receivable',                'asset'),
    (target_org, '1300', 'Pledges Receivable',               'asset'),
    (target_org, '1400', 'Prepaid Expenses',                 'asset'),
    (target_org, '1500', 'Inventory and Programme Supplies', 'asset'),
    (target_org, '1600', 'Property, Plant and Equipment',    'asset'),
    (target_org, '2000', 'Accounts Payable',                 'liability'),
    (target_org, '2100', 'Accrued Expenses',                 'liability'),
    (target_org, '2200', 'Payroll Liabilities',              'liability'),
    (target_org, '2300', 'Deferred Grant Revenue',           'liability'),
    (target_org, '3000', 'Unrestricted Net Assets',          'equity'),
    (target_org, '3100', 'Temporarily Restricted Net Assets','equity'),
    (target_org, '3200', 'Permanently Restricted Net Assets','equity'),
    (target_org, '4000', 'Grant Income',                     'income'),
    (target_org, '4100', 'Individual Donations',             'income'),
    (target_org, '4200', 'Corporate Donations',              'income'),
    (target_org, '4300', 'Fundraising Events Income',        'income'),
    (target_org, '4400', 'In-Kind Contributions',            'income'),
    (target_org, '4500', 'Other Income',                     'income'),
    (target_org, '5000', 'Programme Delivery Costs',         'expense'),
    (target_org, '5100', 'Beneficiary Support and Grants',   'expense'),
    (target_org, '5200', 'Field Operations',                 'expense'),
    (target_org, '5300', 'Training and Capacity Building',   'expense'),
    (target_org, '5400', 'Monitoring and Evaluation',        'expense'),
    (target_org, '5500', 'Programme Staff Costs',            'expense'),
    (target_org, '5600', 'Administration and Overheads',     'expense'),
    (target_org, '5700', 'Fundraising Costs',                'expense'),
    (target_org, '5800', 'Travel and Transport',             'expense'),
    (target_org, '5900', 'Professional and Audit Fees',      'expense')
  ON CONFLICT DO NOTHING;

  -- Default general fund -----------------------------------------------------
  INSERT INTO public.funds (org_id, code, name, fund_type, restrictions)
  VALUES (target_org, 'GEN', 'General Unrestricted Fund', 'unrestricted',
          'Available for any charitable purpose consistent with the organization''s mission.')
  ON CONFLICT DO NOTHING;

  -- Feature flags ------------------------------------------------------------
  INSERT INTO public.feature_flags (org_id, flag_key, is_enabled, description)
  VALUES
    (target_org, 'module_programs',      true,  'Programme management'),
    (target_org, 'module_projects',      true,  'Project management'),
    (target_org, 'module_grants',        true,  'Grant lifecycle management'),
    (target_org, 'module_donors',        true,  'Donor relationship management'),
    (target_org, 'module_fundraising',   true,  'Campaigns and donations'),
    (target_org, 'module_beneficiaries', true,  'Beneficiary registration and services'),
    (target_org, 'module_cases',         true,  'Case management'),
    (target_org, 'module_mel',           true,  'Monitoring, evaluation and learning'),
    (target_org, 'module_field',         true,  'Field operations and data capture'),
    (target_org, 'module_volunteers',    true,  'Volunteer management'),
    (target_org, 'module_hr',            true,  'Staff and human resources'),
    (target_org, 'module_finance',       true,  'Fund accounting and finance'),
    (target_org, 'module_procurement',   true,  'Procurement and purchasing'),
    (target_org, 'module_inventory',     true,  'Inventory and asset management'),
    (target_org, 'module_fleet',         true,  'Vehicle and fleet management'),
    (target_org, 'module_governance',    true,  'Board, policies and compliance'),
    (target_org, 'module_documents',     true,  'Document repository'),
    (target_org, 'module_partners',      true,  'Partner management'),
    (target_org, 'ai_assistant',         true,  'Executive Assistant panel'),
    (target_org, 'ai_insights',          true,  'Smart Insights on dashboards'),
    (target_org, 'ai_documents',         true,  'AI document drafting'),
    (target_org, 'ai_forecasting',       true,  'Predictive analysis'),
    (target_org, 'ai_anomaly_detection', true,  'Anomaly detection'),
    (target_org, 'integration_api',      true,  'Public REST API'),
    (target_org, 'integration_webhooks', true,  'Outbound webhooks'),
    (target_org, 'beta_dashboard_builder', false, 'Custom dashboard builder'),
    (target_org, 'beta_offline_sync',    true,  'Offline field data capture'),
    (target_org, 'future_mobile_app',    false, 'Native mobile application')
  ON CONFLICT DO NOTHING;

  -- Approval workflows -------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.workflow_definitions WHERE org_id = target_org) THEN
    INSERT INTO public.workflow_definitions (org_id, name, module, trigger_on, threshold_minor, steps)
    VALUES
      (target_org, 'Purchase Request Approval', 'procurement', 'create', 0,
       '[{"step":1,"role":"manager","label":"Line manager review"},
         {"step":2,"role":"admin","label":"Finance approval"}]'::jsonb),
      (target_org, 'High Value Procurement', 'procurement', 'create', 500000000,
       '[{"step":1,"role":"manager","label":"Line manager review"},
         {"step":2,"role":"admin","label":"Finance approval"},
         {"step":3,"role":"super_admin","label":"Executive Director sign-off"}]'::jsonb),
      (target_org, 'Project Approval', 'projects', 'status_change', 0,
       '[{"step":1,"role":"manager","label":"Programme review"},
         {"step":2,"role":"admin","label":"Director approval"}]'::jsonb),
      (target_org, 'Leave Request', 'hr', 'create', 0,
       '[{"step":1,"role":"manager","label":"Supervisor approval"}]'::jsonb);
  END IF;

  -- AI configuration ---------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.ai_configurations WHERE org_id = target_org) THEN
    INSERT INTO public.ai_configurations (org_id, provider, default_model, model_routing)
    VALUES (target_org, 'groq', 'llama-3.3-70b-versatile',
      '{"chat":"llama-3.3-70b-versatile",
        "document":"llama-3.3-70b-versatile",
        "analysis":"llama-3.3-70b-versatile",
        "summary":"llama-3.1-8b-instant",
        "reasoning":"llama-3.3-70b-versatile"}'::jsonb);
  END IF;

  -- Communication templates --------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.communication_templates WHERE org_id = target_org) THEN
    INSERT INTO public.communication_templates (org_id, name, channel, subject, body, variables)
    VALUES
      (target_org, 'Donation Acknowledgement', 'email',
       'Thank you for supporting {{organization_name}}',
       'Dear {{donor_name}},' || chr(10) || chr(10) ||
       'Thank you for your generous contribution of {{amount}} received on {{date}}. Your support directly enables our work with the communities we serve.' || chr(10) || chr(10) ||
       'A formal receipt is attached for your records.' || chr(10) || chr(10) ||
       'With gratitude,' || chr(10) || '{{organization_name}}',
       ARRAY['donor_name','amount','date','organization_name']),
      (target_org, 'Grant Report Reminder', 'email',
       'Reporting deadline approaching — {{grant_code}}',
       'Dear {{recipient_name}},' || chr(10) || chr(10) ||
       'This is a reminder that the report for {{grant_title}} ({{grant_code}}) is due on {{due_date}}.' || chr(10) || chr(10) ||
       'Please ensure the narrative and financial sections are finalised before submission.',
       ARRAY['recipient_name','grant_title','grant_code','due_date']),
      (target_org, 'Field Visit Reminder', 'sms',
       NULL,
       '{{organization_name}}: Reminder of your field visit to {{location}} on {{date}}. Please carry your ID and the data collection form.',
       ARRAY['organization_name','location','date']);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Apply to every existing organization
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
    PERFORM public.seed_organization_defaults(org.id);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Seed newly created organizations automatically
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_organization_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.org_id := NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_set_org_id ON public.organizations;
CREATE TRIGGER trg_organizations_set_org_id
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.on_organization_created();

CREATE OR REPLACE FUNCTION public.after_organization_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_organization_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_seed ON public.organizations;
CREATE TRIGGER trg_organizations_seed
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.after_organization_created();


-- #############################################################################
-- ## VERIFICATION
-- #############################################################################

DO $$
DECLARE
  table_count    INTEGER;
  policy_count   INTEGER;
  unprotected    INTEGER;
  function_count INTEGER;
BEGIN
  SELECT count(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT count(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';

  SELECT count(*) INTO unprotected
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  SELECT count(*) INTO function_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '  NegoLinks NGO ERP — installation complete';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '  Tables created ................ %', table_count;
  RAISE NOTICE '  Security policies ............. %', policy_count;
  RAISE NOTICE '  Tables without RLS ............ %', unprotected;
  RAISE NOTICE '  Functions ..................... %', function_count;
  RAISE NOTICE '---------------------------------------------------------';

  IF unprotected > 0 THEN
    RAISE EXCEPTION 'Installation incomplete: % table(s) are missing row level security.', unprotected;
  END IF;

  IF table_count < 60 THEN
    RAISE EXCEPTION 'Installation incomplete: expected at least 60 tables, found %.', table_count;
  END IF;

  RAISE NOTICE '  STATUS: SUCCESS';
  RAISE NOTICE '';
  RAISE NOTICE '  Next steps:';
  RAISE NOTICE '   1. Set your .env values (see SETUP.md)';
  RAISE NOTICE '   2. Sign up in the app — the first user becomes Super Admin';
  RAISE NOTICE '   3. Settings > Demo Data to load a sample organization';
  RAISE NOTICE '=========================================================';
END $$;
