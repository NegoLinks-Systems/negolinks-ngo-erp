-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 006 — Reference data and defaults
--
-- Seeds the nonprofit chart of accounts, feature flags, approval workflows and
-- AI configuration for every organization that does not already have them.
-- Safe to run repeatedly: nothing is duplicated.
-- =============================================================================

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
