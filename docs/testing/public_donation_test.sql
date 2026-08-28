-- Direct table access by an anonymous visitor is refused (expected)
BEGIN; SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM count(*) FROM public.donations;
  RAISE NOTICE 'anon_direct_table_access_blocked: NO -- SECURITY HOLE';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'anon_direct_table_access_blocked: YES'; END $$;
COMMIT;

-- Giving through the sanctioned function
BEGIN; SET LOCAL ROLE anon;
SELECT 'anon_donation_ref: ' || public.record_public_donation(
  'Grace Okoro', 2500000, 'grace@example.org', '+234800000000', NULL, NULL, 'Bank Transfer', false, 'For the borehole');
COMMIT;

BEGIN; SET LOCAL ROLE anon;
SELECT 'anon_anonymous_gift: ' || public.record_public_donation('A Wellwisher', 100000, NULL, NULL, NULL, NULL, 'Card', true, NULL);
COMMIT;

-- Staff view
BEGIN; SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'aaaa1111-1111-4111-8111-111111111111';
SELECT 'staff_sees: ' || donor_name || ' | ' || status || ' | ' || amount_minor || ' | anon=' || is_anonymous
FROM public.donations WHERE reference LIKE 'DON-%' ORDER BY created_at;
SELECT 'notifications_raised: ' || count(*) FROM public.notifications WHERE category='fundraising';
SELECT 'recorded_as_pledge_not_income: ' || bool_and(status='pledged' AND donation_type='pledge')
FROM public.donations WHERE reference LIKE 'DON-%';
COMMIT;
