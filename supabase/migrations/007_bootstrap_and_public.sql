-- =============================================================================
-- NegoLinks NGO & Nonprofit Management ERP
-- Migration 007 — First-run bootstrap, invitations and public donations
--
-- Row level security creates a deliberate chicken-and-egg problem at first run:
-- every policy resolves the caller's organization through app_users, so the very
-- first user has no organization and therefore cannot create one. The functions
-- below are the only sanctioned way across that gap. Each is SECURITY DEFINER,
-- so it runs with the owner's rights, and each carries an explicit guard that
-- limits exactly what it will do.
--
-- Idempotent. Verified against PostgreSQL 16.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- needs_bootstrap()
--
-- True when this deployment has no organization yet, so the sign-in screen can
-- offer first-run setup instead of a password prompt. Deliberately readable
-- before sign-in; it reveals only whether the installation is empty.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.needs_bootstrap()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.organizations WHERE deleted_at IS NULL);
$$;

-- -----------------------------------------------------------------------------
-- bootstrap_first_admin()
--
-- Creates the organization and makes the caller its Super Admin.
--
-- Guards:
--   * the caller must be signed in
--   * the installation must have no organization (so this runs exactly once)
--   * the caller must not already hold a profile
--
-- Once an organization exists this function refuses to act, so it cannot be used
-- later to mint an administrator or to join somebody else's organization.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  p_org_name  TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_email     TEXT DEFAULT NULL,
  p_country   TEXT DEFAULT 'Nigeria',
  p_currency  TEXT DEFAULT 'NGN'
)
RETURNS public.app_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller     UUID := auth.uid();
  new_org    UUID;
  new_profile public.app_users;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to set up an organization.'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.app_users WHERE auth_user_id = caller AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This account already belongs to an organization.'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This installation is already set up. Ask an administrator to invite you.'
      USING ERRCODE = '42501';
  END IF;

  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'An organization name is required.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (name, legal_name, country, base_currency)
  VALUES (trim(p_org_name), trim(p_org_name), coalesce(p_country, 'Nigeria'), coalesce(p_currency, 'NGN'))
  RETURNING id INTO new_org;

  INSERT INTO public.app_users (
    org_id, auth_user_id, full_name, email, role, job_title, is_active, last_login_at
  )
  VALUES (
    new_org,
    caller,
    coalesce(nullif(trim(p_full_name), ''), 'Administrator'),
    coalesce(nullif(trim(p_email), ''), (SELECT email FROM auth.users WHERE id = caller), 'admin@example.org'),
    'super_admin',
    'Executive Director',
    true,
    now()
  )
  RETURNING * INTO new_profile;

  RETURN new_profile;
END;
$$;

-- -----------------------------------------------------------------------------
-- claim_invitation()
--
-- An administrator invites a colleague by creating an app_users row carrying
-- their email address and no auth_user_id. When that person signs in for the
-- first time this links the two, so nobody has to copy identifiers by hand.
--
-- Guards:
--   * matches on the caller's own verified address only
--   * claims only rows that are still unclaimed
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_invitation()
RETURNS public.app_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller       UUID := auth.uid();
  caller_email TEXT;
  claimed      public.app_users;
BEGIN
  IF caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(email) INTO caller_email FROM auth.users WHERE id = caller;
  IF caller_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Already linked: hand back the existing profile.
  SELECT * INTO claimed
  FROM public.app_users
  WHERE auth_user_id = caller AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.app_users SET last_login_at = now() WHERE id = claimed.id;
    RETURN claimed;
  END IF;

  UPDATE public.app_users
  SET auth_user_id = caller,
      last_login_at = now()
  WHERE lower(email) = caller_email
    AND auth_user_id IS NULL
    AND deleted_at IS NULL
    AND is_active = true
  RETURNING * INTO claimed;

  RETURN claimed;
END;
$$;

-- -----------------------------------------------------------------------------
-- Public donation intake
--
-- The public website accepts donations from visitors who are not signed in.
-- Anonymous visitors are never given write access to the donations table
-- directly; they reach it only through these functions, which decide exactly
-- what may be written.
-- -----------------------------------------------------------------------------

-- The organization details a public page may display. Contact and mission
-- information only — nothing financial, and nothing about beneficiaries.
CREATE OR REPLACE FUNCTION public.public_organization_profile()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  legal_name    TEXT,
  mission       TEXT,
  vision        TEXT,
  email         TEXT,
  phone         TEXT,
  website       TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  country       TEXT,
  base_currency TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, legal_name, mission, vision, email, phone, website,
         address, city, state, country, base_currency
  FROM public.organizations
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
$$;

-- Campaigns a visitor may choose to give towards. Running campaigns only, and
-- only the fields needed to show progress.
CREATE OR REPLACE FUNCTION public.public_active_campaigns()
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  description  TEXT,
  target_minor BIGINT,
  raised_minor BIGINT,
  currency     TEXT,
  end_date     DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description, target_minor, raised_minor, currency, end_date
  FROM public.campaigns
  WHERE deleted_at IS NULL
    AND status = 'running'
  ORDER BY created_at DESC
  LIMIT 12;
$$;

-- Records a visitor's intention to give.
--
-- The record is written as a PLEDGE, never as money received. Finance staff
-- confirm receipt in the Fundraising module once the funds actually arrive, so
-- a public form can never inflate reported income.
CREATE OR REPLACE FUNCTION public.record_public_donation(
  p_donor_name     TEXT,
  p_amount_minor   BIGINT,
  p_email          TEXT DEFAULT NULL,
  p_phone          TEXT DEFAULT NULL,
  p_campaign_id    UUID DEFAULT NULL,
  p_currency       TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Bank Transfer',
  p_is_anonymous   BOOLEAN DEFAULT false,
  p_message        TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_org UUID;
  org_currency TEXT;
  reference  TEXT;
  recent     INTEGER;
BEGIN
  SELECT id, base_currency INTO target_org, org_currency
  FROM public.organizations
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF target_org IS NULL THEN
    RAISE EXCEPTION 'This site is not accepting donations yet.' USING ERRCODE = '22023';
  END IF;

  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Please enter an amount greater than zero.' USING ERRCODE = '22023';
  END IF;

  -- An upper bound keeps a mistyped or malicious figure out of the register.
  IF p_amount_minor > 100000000000000 THEN
    RAISE EXCEPTION 'That amount is larger than this form accepts. Please contact us directly.'
      USING ERRCODE = '22023';
  END IF;

  IF coalesce(trim(p_donor_name), '') = '' THEN
    RAISE EXCEPTION 'Please tell us who the gift is from.' USING ERRCODE = '22023';
  END IF;

  -- Light flood control: cap pledges recorded in the last minute.
  SELECT count(*) INTO recent
  FROM public.donations
  WHERE org_id = target_org
    AND created_at > now() - interval '1 minute';

  IF recent > 20 THEN
    RAISE EXCEPTION 'Too many submissions right now. Please try again shortly.'
      USING ERRCODE = '53400';
  END IF;

  IF p_campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND org_id = target_org AND deleted_at IS NULL
  ) THEN
    p_campaign_id := NULL;
  END IF;

  reference := 'DON-' || to_char(now(), 'YYYYMMDD') || '-' ||
               upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  INSERT INTO public.donations (
    org_id, reference, campaign_id, donor_name, donation_type,
    amount_minor, currency, pledge_due_on, payment_method,
    status, is_anonymous, note
  )
  VALUES (
    target_org,
    reference,
    p_campaign_id,
    left(trim(p_donor_name), 160),
    'pledge',
    p_amount_minor,
    coalesce(nullif(trim(p_currency), ''), org_currency, 'NGN'),
    CURRENT_DATE + 30,
    coalesce(nullif(trim(p_payment_method), ''), 'Bank Transfer'),
    'pledged',
    coalesce(p_is_anonymous, false),
    concat_ws(E'\n',
      nullif(trim(p_message), ''),
      CASE WHEN nullif(trim(p_email), '') IS NOT NULL THEN 'Email: ' || trim(p_email) END,
      CASE WHEN nullif(trim(p_phone), '') IS NOT NULL THEN 'Phone: ' || trim(p_phone) END,
      'Submitted through the public website.'
    )
  );

  INSERT INTO public.notifications (org_id, title, body, category, severity, link)
  VALUES (
    target_org,
    'New donation pledge received',
    CASE WHEN coalesce(p_is_anonymous, false)
         THEN 'An anonymous supporter pledged a gift through the website.'
         ELSE trim(p_donor_name) || ' pledged a gift through the website.' END,
    'fundraising',
    'success',
    '/app/fundraising'
  );

  RETURN reference;
END;
$$;

-- -----------------------------------------------------------------------------
-- Execution rights
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_invitation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_public_donation(TEXT, BIGINT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.needs_bootstrap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_organization_profile() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_active_campaigns() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_donation(TEXT, BIGINT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- Setting up and claiming an invitation both require a signed-in account.
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invitation() TO authenticated;
