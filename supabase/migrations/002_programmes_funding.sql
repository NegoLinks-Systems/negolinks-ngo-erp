-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 002 — Programmes, projects, donors, grants and fundraising
-- Idempotent. Verified against PostgreSQL 16.
-- =============================================================================

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

