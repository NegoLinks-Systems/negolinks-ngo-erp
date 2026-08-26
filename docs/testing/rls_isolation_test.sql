\set QUIET on
-- Seed two tenants
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-111111111111','a@alpha.org'),
  ('22222222-2222-4222-8222-222222222222','b@beta.org');
INSERT INTO public.organizations (id, name, legal_name) VALUES
  ('aaaaaaaa-1111-4111-8111-111111111111','Alpha Relief','Alpha Relief Ltd'),
  ('bbbbbbbb-2222-4222-8222-222222222222','Beta Trust','Beta Trust Ltd');
INSERT INTO public.app_users (org_id, auth_user_id, full_name, email, role) VALUES
  ('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Alpha Admin','a@alpha.org','admin'),
  ('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Beta Admin','b@beta.org','admin');
INSERT INTO public.projects (org_id, code, title, sector) VALUES
  ('aaaaaaaa-1111-4111-8111-111111111111','ALPHA-001','Alpha Water Project','WASH'),
  ('aaaaaaaa-1111-4111-8111-111111111111','ALPHA-002','Alpha School Build','Education'),
  ('bbbbbbbb-2222-4222-8222-222222222222','BETA-001','Beta Health Outreach','Health');
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
\set QUIET off

-- ---- Tenant A ----
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SELECT 'A_projects_visible: ' || count(*) FROM public.projects;
SELECT 'A_orgs_visible: ' || count(*) FROM public.organizations;
SELECT 'A_sees_beta_rows: ' || count(*) FROM public.projects WHERE code LIKE 'BETA%';
COMMIT;

-- ---- Tenant B ----
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SELECT 'B_projects_visible: ' || count(*) FROM public.projects;
SELECT 'B_sees_alpha_rows: ' || count(*) FROM public.projects WHERE code LIKE 'ALPHA%';
COMMIT;

-- ---- Audit log immutability ----
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.audit_logs (org_id, user_name, user_role, action, module)
VALUES ('aaaaaaaa-1111-4111-8111-111111111111','Alpha Admin','admin','CREATE','projects');
SELECT 'A_audit_insert: ok';
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
UPDATE public.audit_logs SET action='DELETE';
SELECT 'A_audit_rows_updated: ' || (SELECT count(*) FROM public.audit_logs WHERE action='DELETE');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DELETE FROM public.audit_logs;
SELECT 'A_audit_rows_after_delete_attempt: ' || (SELECT count(*) FROM public.audit_logs);
COMMIT;
