-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 004 — Finance, operations, governance and system tables
-- Idempotent. Verified against PostgreSQL 16.
-- =============================================================================

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

