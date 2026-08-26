-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- 00_RESET_DATABASE.sql
--
-- WARNING: THIS PERMANENTLY DELETES ALL APPLICATION DATA.
--
-- Run this ONLY when you want a completely clean installation. It drops every
-- table, function and trigger this product created. It does NOT touch Supabase
-- system schemas (auth, storage, realtime) or your user accounts.
--
-- Normal upgrade path: do NOT run this file. Run 01_INSTALL_ALL.sql on its own —
-- it is idempotent and safe on an existing database.
--
-- HOW TO RUN
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Paste this entire file
--   3. Press Run
--   4. Then paste and run 01_INSTALL_ALL.sql
-- =============================================================================

-- Drop application tables in dependency-safe order using CASCADE.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', t.relname);
  END LOOP;
END $$;

-- Drop application functions.
DROP FUNCTION IF EXISTS public.seed_organization_defaults(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.after_organization_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_organization_created() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.current_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_member_of(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager() CASCADE;
DROP FUNCTION IF EXISTS public.can_write() CASCADE;

-- Confirmation.
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT count(*) INTO remaining
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';

  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'RESET COMPLETE. Tables remaining in public schema: %', remaining;
  RAISE NOTICE 'Next step: run 01_INSTALL_ALL.sql';
  RAISE NOTICE '=====================================================';
END $$;
