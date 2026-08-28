# NegoLinks NGO & Nonprofit Management ERP — Setup Guide

**Version 1.0.0 · Schema 012 · Released 2026-08-11**
Part of the NegoLinks Enterprise Suite.

This guide takes you from a fresh copy of the code to a live deployment at
`https://ngo.negolinks.com`, then covers day-to-day operation and recovery.

Every SQL file referenced here was executed against a real PostgreSQL 16 instance
before release. You are not the first person to run them.

---

## Contents

1. [What you need before you start](#1-what-you-need-before-you-start)
2. [Get the code running locally](#2-get-the-code-running-locally)
3. [Create the database](#3-create-the-database)
4. [Configure the environment](#4-configure-the-environment)
5. [Switch on AI](#5-switch-on-ai)
6. [Deploy the Edge Functions and schedule the jobs](#6-deploy-the-edge-functions-and-schedule-the-jobs)
7. [Deploy the application and point the domain](#7-deploy-the-application-and-point-the-domain)
8. [First run: create your organization](#8-first-run-create-your-organization)
9. [Backup, recovery and upgrades](#9-backup-recovery-and-upgrades)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What you need before you start

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20 or later | `node --version` to check |
| npm | 10 or later | Ships with Node |
| A Supabase project | Free tier is enough to begin | [supabase.com](https://supabase.com) |
| A Groq API key | Optional but recommended | [console.groq.com](https://console.groq.com) — enables all AI features |
| A hosting account | Vercel, Netlify or any static host | Vercel configuration is included |
| Access to DNS for `negolinks.com` | — | Only needed for the production domain |

Budget about 45 minutes for a first deployment.

**The application runs without a backend.** If you open it with no Supabase
credentials configured, it starts in evaluation mode: everything works, data is
stored in your browser, and you can load demo data to explore every module. That
is useful for a demonstration, but it is not multi-user and the data lives only on
that one device. Sections 3 onward set up the real thing.

---

## 2. Get the code running locally

```bash
# Unpack and enter the project
unzip negolinks-ngo-erp.zip
cd negolinks-ngo-erp

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173`. You should see the public website. This is the
right moment to confirm the build is healthy on your machine:

```bash
npm run typecheck   # no type errors
npm run lint        # no lint errors
npm run test        # 70 tests should pass
npm run build       # production build
```

### Putting it under version control

Do this before you change anything, so you can always get back.

```bash
git init
git add .
git commit -m "NegoLinks NGO ERP v1.0.0 — initial import"

# Point at your own repository
git remote add origin https://github.com/YOUR-ORG/negolinks-ngo-erp.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `dist` and `.env`. Your API keys
will not be committed.

---

## 3. Create the database

### 3.1 Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and choose **New project**.
2. Name it (for example `negolinks-ngo`).
3. Set a strong database password and **record it somewhere safe** — you will
   need it for backups and it cannot be recovered later.
4. Choose the region closest to your users. For Nigerian organizations, `eu-west-1`
   (Ireland) is usually the lowest latency option available.
5. Wait for provisioning to finish, roughly two minutes.

### 3.2 Install the schema

1. In your project, open **SQL Editor → New query**.
2. Open `supabase/sql/01_INSTALL_ALL.sql` from this package.
3. Copy the **entire** file and paste it into the editor.
4. Press **Run**. It takes 10–30 seconds.

You should see this at the end:

```
=========================================================
  NegoLinks NGO ERP — installation complete
=========================================================
  Tables created ................ 72
  Security policies ............. 286
  Tables without RLS ............ 0
  Functions ..................... 56
---------------------------------------------------------
  STATUS: SUCCESS
```

**If any table were missing row level security, the script would stop with an
error rather than report success.** A `SUCCESS` message means your data is
protected.

> **The script is safe to run twice.** Every statement is idempotent. If it fails
> partway through — a dropped connection, a timeout — simply run the whole file
> again. That is the correct recovery action, not a workaround.

### 3.3 If you need to start over

Only when you want to destroy everything and begin again:

1. Run `supabase/sql/00_RESET_DATABASE.sql` — **this permanently deletes all
   application data**.
2. Then run `01_INSTALL_ALL.sql`.

You do **not** need the reset script to upgrade. See [section 9.3](#93-upgrading).

### 3.4 Verify it yourself

If you want to confirm the security model rather than take it on trust, the
harness in `docs/testing/` reproduces the release verification on your own
machine — including a test that proves one organization cannot read another's
records. See `docs/testing/README.md`.

---

## 4. Configure the environment

Copy the template and fill it in:

```bash
cp .env.example .env
```

```ini
# ---- Supabase (Project Settings → API) ----
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# ---- Organization defaults ----
VITE_SUPPORT_EMAIL=support@negolinks.com
VITE_SUPPORT_PHONE=+234 000 000 0000
VITE_VERIFY_BASE_URL=https://ngo.negolinks.com/verify
```

**Where to find the Supabase values:** Project Settings → API. You want the
**Project URL** and the **anon / public** key.

> **Only ever put the anon key in `.env`.** The `service_role` key bypasses all
> row level security. It belongs in Edge Function secrets (section 6) and nowhere
> near the browser. Anything prefixed `VITE_` is compiled into the JavaScript
> your users download.

Restart `npm run dev` after editing `.env` — Vite reads it at startup.

---

## 5. Switch on AI

The Intelligence Engine powers the Executive Assistant, Smart Insights,
document drafting, forecasting and anomaly detection. Without a key those
features fall back to a grounded local summariser: still useful, but not
generative.

1. Create a free key at [console.groq.com](https://console.groq.com). Groq keys
   begin `gsk_`.
2. In Supabase, open **Project Settings → Edge Functions → Secrets**.
3. Add:

   | Secret | Value |
   |---|---|
   | `AI_API_KEY` | your `gsk_...` key |
   | `AI_PROVIDER` | `groq` |

**The key is never sent to the browser.** Requests go from the application to the
`ai-gateway` function, which holds the key server-side and returns only the
generated text. The response deliberately does not identify which model or vendor
answered — to your users it is the NegoLinks Intelligence Engine.

To use a different vendor, set `AI_PROVIDER` to `openai` or `openrouter` and
supply the matching key. No code changes are needed.

Limits and model routing are adjustable in the application under
**Settings → AI Platform**.

---

## 6. Deploy the Edge Functions and schedule the jobs

### 6.1 Install the Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

Your project reference is in the dashboard URL:
`https://supabase.com/dashboard/project/YOUR-PROJECT-REF`.

### 6.2 Deploy

```bash
supabase functions deploy ai-gateway
supabase functions deploy comm-gateway
supabase functions deploy daily-jobs
supabase functions deploy api
supabase functions deploy backup
```

| Function | What it does |
|---|---|
| `ai-gateway` | All AI requests. Holds the key, routes by task, rate limits, audits. |
| `comm-gateway` | Email, SMS and WhatsApp delivery. |
| `daily-jobs` | Grant expiry, report reminders, compliance and budget alerts. |
| `api` | Public REST API at `/api/v1/`. |
| `backup` | Full organizational export. |

### 6.3 Communication secrets

Add only the ones you intend to use.

**Email** — set `EMAIL_PROVIDER` to `smtp`, `gmail`, `m365` or `emailjs`:

| Secret | Notes |
|---|---|
| `EMAIL_API_KEY` | API key for your relay |
| `EMAIL_API_URL` | Endpoint, if not the default |
| `EMAIL_FROM` | The address messages come from |

**SMS** — set `SMS_PROVIDER` to `termii`, `smartsms`, `africastalking` or `twilio`:

| Provider | Secrets |
|---|---|
| Termii | `TERMII_API_KEY`, `SMS_SENDER_ID` |
| SmartSMSSolutions | `SMARTSMS_TOKEN`, `SMS_SENDER_ID` |
| Africa's Talking | `AT_API_KEY`, `AT_USERNAME` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |

**WhatsApp** — `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` from Meta Cloud API.

### 6.4 Schedule the daily jobs

First set a shared secret so only the scheduler can trigger the jobs. Add an
Edge Function secret `CRON_SECRET` with a long random value, then run this in the
SQL Editor, substituting your project reference and the same secret:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily maintenance and alerts at 06:00
SELECT cron.schedule(
  'negolinks-ngo-daily-jobs',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/daily-jobs',
    headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR-CRON-SECRET"}'::jsonb
  );
  $$
);

-- Nightly backup at 02:00
SELECT cron.schedule(
  'negolinks-ngo-backup',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/backup',
    headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR-CRON-SECRET"}'::jsonb
  );
  $$
);
```

Check what is scheduled with `SELECT * FROM cron.job;` and what has run with
`SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`.

Job outcomes also appear in the application under **Settings → System Health**.

---

## 7. Deploy the application and point the domain

### 7.1 Vercel (recommended — configuration included)

```bash
npm install -g vercel
vercel
```

Then add your environment variables in the Vercel dashboard under
**Settings → Environment Variables**: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_PHONE` and
`VITE_VERIFY_BASE_URL`. Then:

```bash
vercel --prod
```

`vercel.json` is already configured to rewrite all routes to `index.html`, which
client-side routing requires.

### 7.2 Netlify

Build command `npm run build`, publish directory `dist`. Add a `_redirects` file
containing:

```
/*  /index.html  200
```

### 7.3 Any static host

```bash
npm run build
```

Upload the contents of `dist/` and configure the server to serve `index.html` for
any path it does not recognise. Without that rule, refreshing on `/app/projects`
returns a 404.

### 7.4 DNS for ngo.negolinks.com

Add a CNAME record at your DNS provider:

| Type | Name | Value |
|---|---|---|
| CNAME | `ngo` | `cname.vercel-dns.com` |

Then add `ngo.negolinks.com` as a custom domain in your hosting dashboard.
Propagation usually takes minutes; allow up to 24 hours. HTTPS is issued
automatically.

Finally, in Supabase open **Authentication → URL Configuration** and set the Site
URL to `https://ngo.negolinks.com`, adding it to the redirect allow-list. Sign-in
will fail until you do.

---

## 8. First run: create your organization

The application detects an empty installation and offers first-time setup in
place of the usual password prompt.

1. Visit your deployment and choose **Sign In**. Because no organization exists
   yet, the screen shows **First-time setup** instead.
2. Enter your organization name, your full name, your email address and a
   password of at least eight characters.
3. Choose **Create organization**.

That account becomes **Super Admin**, the organization is created, and the
nonprofit chart of accounts, feature flags and approval workflows are seeded
automatically.

**Setup closes behind you.** Once an organization exists the setup path refuses
to run again, so nobody who later signs up can mint themselves an administrator
account or attach themselves to your organization.

> **If email confirmation is switched on** in your Supabase project
> (Authentication → Providers → Email), you will be asked to confirm your address
> first. Confirm it, return to the sign-in screen, sign in, and setup continues
> from there. To skip this on a private deployment, turn off *Confirm email* in
> that same panel before you begin.

### Adding your team

Because your colleagues need a Supabase auth account as well as an application
profile, invitations work in two steps:

1. In the app, go to **Settings → Users & Roles** and add the person with their
   email address and the role they should hold. This creates their profile with
   no account attached to it yet.
2. Have them sign up, or invite them from the Supabase dashboard under
   **Authentication → Users → Invite**.

The first time they sign in, the application matches their verified email address
to the profile you created and links the two. Nobody has to copy identifiers by
hand, and an address you have not invited gets nowhere — it is told to contact an
administrator.

### Roles

| Role | Can do |
|---|---|
| Super Admin | Everything, including deleting the organization |
| Admin | All modules, user management, system settings |
| Manager | All modules, approve requests, delete records |
| Staff | Create and edit records in permitted modules |
| Viewer | Read-only |
| Auditor | Read-only, including the full audit trail |

### Try it with demo data first

**Settings → Demo Data** generates a complete, interconnected sample
organization — donors funding grants, grants funding projects, beneficiaries
enrolled in those projects, indicators measuring delivery, and transactions
drawing down budget lines. Five scales are available, from a community-based
organization to an international NGO.

Demo records are marked separately from real ones. Deleting demo data removes
only records carrying that marker; anything your team has entered is untouched.

### Accepting donations from your website

The public site includes a **Donate** page at `/donate`, linked from the header,
the footer and the home page. Visitors choose an amount, optionally pick a
campaign, and submit their details.

**Gifts arrive as pledges, never as recorded income.** They appear under
**Fundraising → Donations & pledges** with a reference number, and a notification
is raised for your team. Finance staff mark a pledge as received once the money
actually arrives, so a public form can never inflate your reported income.

Campaigns appear on the donate page only while their status is **Running**, so
you control what visitors are asked to give towards.

The form records the intention to give and shows your contact details for
transfer; it does not take card payments. To add a payment gateway, extend the
`record_public_donation` function and the `publicSite.service.ts` client.

## 9. Backup, recovery and upgrades

### 9.1 Backups

**Three independent layers, and you should use all three.**

**Supabase automatic backups.** Daily on paid plans, retained by tier. Found under
Database → Backups. These are your fastest route back from a database-level
disaster.

**Scheduled application backups.** The `backup` function (section 6.4) writes a
full JSON export nightly and records each run in `backup_records`, visible under
Settings → System Health.

**Manual export before anything risky.** Take one before an upgrade, a large
import, or any bulk change:

```bash
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/backup' \
  -H "Authorization: Bearer YOUR-USER-ACCESS-TOKEN" \
  -o "backup-$(date +%Y-%m-%d).json"
```

You can also take a complete SQL dump, which captures everything including
schema:

```bash
pg_dump "postgresql://postgres:YOUR-DB-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres" \
  --clean --if-exists -f "negolinks-ngo-$(date +%Y-%m-%d).sql"
```

Store dumps somewhere other than the machine that created them.

### 9.2 Recovery

**A user deleted a record.** Nothing is truly deleted — the application sets
`deleted_at` and hides the row. An administrator can restore it:

```sql
UPDATE public.projects
SET deleted_at = NULL
WHERE id = 'THE-RECORD-ID';
```

Find what was removed, and by whom, in **Settings → Audit Trail**.

**A bad change went out.** Restore from a Supabase point-in-time backup
(Database → Backups → Restore). This replaces the whole database, so anything
entered after the restore point is lost — check the timestamp carefully.

**The database is gone entirely.** From a SQL dump:

```bash
psql "postgresql://postgres:YOUR-DB-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres" \
  -f negolinks-ngo-2026-08-11.sql
```

From scratch with a JSON export: create a new Supabase project, run
`01_INSTALL_ALL.sql`, then import the JSON table by table with the service role
key. Restore parent tables before child tables — `organizations`, then
`programs`, `donors`, `grants`, then `projects`, and so on.

**The site is down but the database is fine.** Redeploy the frontend. It holds no
state; all data lives in Supabase.

**Recovery drill.** Restore a backup into a scratch Supabase project once a
quarter and sign in. A backup you have never restored is a hypothesis, not a
backup.

### 9.3 Upgrading

1. Take a manual backup (section 9.1).
2. Pull the new version into your repository.
3. Run the new `supabase/sql/01_INSTALL_ALL.sql` in the SQL Editor. It is
   idempotent: existing tables are left alone, new ones are added, and your data
   is preserved. **Do not run the reset script.**
4. Redeploy the frontend.
5. Redeploy any Edge Functions that changed.

Check the schema version under **Settings → About** to confirm the upgrade landed.

---

## 10. Troubleshooting

**"Invalid API key" or a blank screen on load.**
`VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is wrong or missing. Values must
be set in your hosting dashboard, not only in your local `.env`, and the site must
be rebuilt after adding them — `VITE_` variables are baked in at build time.

**Sign-in redirects to an error page.**
Set the Site URL in Supabase under Authentication → URL Configuration to your
deployed address, and add it to the redirect allow-list.

**Refreshing a page inside the app gives a 404.**
Your host is not rewriting unknown paths to `index.html`. See section 7.3.

**The app loads but every module is empty.**
Expected on a new installation. Load demo data from Settings → Demo Data, or
start entering your own records.

**"AI features are not configured."**
`AI_API_KEY` is not set as an Edge Function secret, or `ai-gateway` has not been
deployed. See sections 5 and 6.

**AI stops responding partway through a month.**
You have hit the monthly request limit. Raise it under Settings → AI Platform, or
check usage in the `ai_audit_logs` table.

**Users see one another's data.**
This should be impossible — every table is protected by row level security. Run
the isolation test in `docs/testing/` to confirm, and check that nobody has run
the application with the `service_role` key, which bypasses those policies by
design.

**Messages are not being delivered.**
Check Settings → Communication → Delivery log. Each attempt records the provider
response, which usually names the problem — an unverified sender address or an
exhausted credit balance are the common causes.

**Alerts are not appearing.**
Confirm the scheduled jobs are running: `SELECT * FROM cron.job_run_details ORDER
BY start_time DESC LIMIT 20;`. A `CRON_SECRET` mismatch between the Edge Function
secret and the scheduled call returns 401.

---

## Support

| | |
|---|---|
| Email | support@negolinks.com |
| Web | [negolinks.com](https://negolinks.com) |
| This product | `https://ngo.negolinks.com` |

Licensed to your organization by NEGO LINKS SYSTEMS LTD. All rights reserved.

**Powered by NegoLinks Enterprise Suite**
