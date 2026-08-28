INSERT INTO auth.users (id, email) VALUES
  ('aaaa1111-1111-4111-8111-111111111111','founder@ngo.org'),
  ('bbbb2222-2222-4222-8222-222222222222','officer@ngo.org'),
  ('cccc3333-3333-4333-8333-333333333333','stranger@elsewhere.org');
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- 1. Before setup, an anonymous visitor is told the site needs bootstrapping
BEGIN; SET LOCAL ROLE anon;
SELECT 'step1_needs_bootstrap: ' || public.needs_bootstrap();
COMMIT;

-- 2. The founder signs in and sets up the organization
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'aaaa1111-1111-4111-8111-111111111111';
SELECT 'step2_role_granted: ' || role FROM public.bootstrap_first_admin('Hope Alliance','Nego Founder');
COMMIT;

-- 3. Bootstrap is now closed
BEGIN; SET LOCAL ROLE anon;
SELECT 'step3_needs_bootstrap_now: ' || public.needs_bootstrap();
COMMIT;

-- 4. A stranger cannot mint themselves an admin account
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'cccc3333-3333-4333-8333-333333333333';
DO $$ BEGIN
  PERFORM public.bootstrap_first_admin('Hijack Inc','Bad Actor');
  RAISE NOTICE 'step4_stranger_blocked: NO -- SECURITY HOLE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'step4_stranger_blocked: YES (%)', SQLERRM;
END $$;
COMMIT;

-- 5. The founder can now read and write inside their organization
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'aaaa1111-1111-4111-8111-111111111111';
SELECT 'step5_org_visible: ' || count(*) FROM public.organizations;
SELECT 'step5_seeded_accounts: ' || count(*) FROM public.accounts;
INSERT INTO public.projects (org_id, code, title, sector)
VALUES (public.current_org_id(),'PRJ-001','Clean Water','WASH')
RETURNING 'step5_insert_returning_works: ' || code;
COMMIT;

-- 6. The founder invites a colleague; the colleague claims it on first sign-in
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'aaaa1111-1111-4111-8111-111111111111';
INSERT INTO public.app_users (org_id, full_name, email, role)
VALUES (public.current_org_id(),'Field Officer','officer@ngo.org','staff');
COMMIT;

BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'bbbb2222-2222-4222-8222-222222222222';
SELECT 'step6_invite_claimed_as: ' || role FROM public.claim_invitation();
SELECT 'step6_officer_sees_projects: ' || count(*) FROM public.projects;
COMMIT;

-- 7. The stranger claims nothing and sees nothing
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'cccc3333-3333-4333-8333-333333333333';
SELECT 'step7_stranger_claim_rows: ' || count(*) FROM public.claim_invitation();
SELECT 'step7_stranger_sees_projects: ' || count(*) FROM public.projects;
COMMIT;
