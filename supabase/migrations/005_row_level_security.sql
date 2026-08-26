-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 005 — Row Level Security
--
-- Security model:
--   * Every table has RLS ENABLED and FORCED (owners are not exempt).
--   * Reads are scoped to the caller's organization via current_org_id().
--   * Writes additionally require an appropriate role.
--   * audit_logs is insert-only: no UPDATE or DELETE policy exists, so those
--     operations are denied for every non-service role.
--   * The service_role key bypasses RLS by design and is used only by trusted
--     server-side Edge Functions.
--
-- Idempotent. Verified against PostgreSQL 16.
-- =============================================================================

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
