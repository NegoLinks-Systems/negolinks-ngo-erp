-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 003 — Beneficiaries, MEL, field operations and people
-- Idempotent. Verified against PostgreSQL 16.
-- =============================================================================

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

