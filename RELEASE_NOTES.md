# Release Notes

## v1.1.0 — 27 August 2026

**Schema 013.** Run `supabase/sql/01_INSTALL_ALL.sql` again to upgrade — it is
idempotent and preserves your data. Do not run the reset script.

### Fixed: the first account could not be created

Row level security made first-run setup impossible against a real Supabase
project. Every policy resolves the caller's organization through `app_users`, so
the very first user had no organization and could not create one: the
`INSERT ... RETURNING` used to create it was filtered out by the SELECT policy
and failed.

Setup now runs through `bootstrap_first_admin`, a guarded database function that
crosses that gap exactly once. Related additions:

- `needs_bootstrap` lets the sign-in screen offer first-time setup while the
  installation is empty
- `claim_invitation` links an invited colleague to their profile by verified
  email address on first sign-in
- The sign-in screen gained a first-time setup mode; previously there was no way
  to create an account in the application at all

This path is now covered by `docs/testing/first_run_journey_test.sql`, which also
proves a second person cannot use setup to mint themselves an administrator
account.

### Added: a Donate page on the public website

Supporters can give directly from the public site — choose an amount, pick a
campaign, give anonymously if they prefer. Reachable from the header, the footer
and the home page.

Gifts are recorded as **pledges, never as income**, so a form open to the
internet cannot inflate reported figures; finance staff confirm receipt in the
Fundraising module once money arrives. Anonymous visitors get no direct table
access at all — they reach the donations register only through a guarded function
that validates the amount, rejects empty submissions and rate-limits floods.
Covered by `docs/testing/public_donation_test.sql`.

---

## v1.0.0 — 11 August 2026

First release of the **NegoLinks NGO & Nonprofit Management ERP**, the newest
product in the NegoLinks Enterprise Suite.

### Modules

Organization and branches · Programmes · Projects · Grants · Donors ·
Fundraising and campaigns · Beneficiaries · Households · Case management ·
Monitoring, evaluation and learning · Logical framework · Field operations ·
Volunteers · Staff and HR · Partners · Fund accounting · Budgets · Procurement ·
Inventory · Assets · Fleet · Compliance · Governance · Risk register · Documents ·
Reporting · Analytics · Calendar · Approvals · Universal search · Notifications ·
AI intelligence · Demo data manager

### Highlights

**A public website with a Donate page.** Visitors see a full public site — home,
platform, solutions, about, contact — plus a **Donate** page where supporters
choose an amount, pick a campaign and pledge a gift, and a document verification
page where anyone holding a report can confirm it was genuinely issued by the
organization.

Public gifts are recorded as **pledges, never as income**. Finance staff confirm
receipt once the money arrives, so a form open to the internet can never inflate
reported income. Anonymous visitors have no direct access to any table; they
reach the donations register only through a guarded database function that
validates the amount, rejects empty submissions and rate-limits floods.

**Guided first-run setup.** An empty installation offers first-time setup instead
of a password prompt: name your organization, create your account, and you are
its Super Admin with the chart of accounts, feature flags and approval workflows
already seeded. Setup then closes permanently, so nobody who signs up later can
mint themselves an administrator account. Colleagues are invited by email address
and linked automatically the first time they sign in.

**Light and dark modes.** Dark by default, switchable everywhere including the
public site, with the choice remembered. The splash and sign-in screens stay dark
in both modes by brand standard.

**Beneficiary privacy by default.** Direct identifiers are masked in listings and
visible only to authorized roles. Records can be anonymized on request while
preserving the programme statistics that reporting depends on.

**Nine-stage grant pipeline.** Opportunity through to closeout, with automatic
alerts for grants expiring within 90 days and overdue donor reports.

**Fund accounting that understands nonprofits.** Restricted and unrestricted
funds, a 30-account nonprofit chart of accounts seeded on first run, and budget
versus actual by project, grant and category.

**Offline-capable field capture.** Visits are recorded without connectivity and
synchronised when a signal returns.

**AI throughout.** Executive Assistant, Smart Insights on every dashboard,
document drafting, forecasting and anomaly detection — grounded in the
organization's own records, never inventing figures.

**Four languages.** English, French, Arabic and Portuguese, with right-to-left
layout support.

### Security

- Row level security enabled and **forced** on all 72 tables — 286 policies
- Tenant isolation verified by automated test, not assumption
- The audit log has no update or delete policy: entries cannot be altered or removed
- AI and communication provider keys are held server-side and never reach the browser
- Beneficiary identifiers are excluded from public API responses entirely
- Soft deletes throughout, so an accidental deletion is recoverable

### Quality

- 70 unit and component tests; Playwright end-to-end journeys
- Type checking, linting and the database migrations all run in CI
- The installer verifies its own work and fails loudly rather than reporting a
  false success
- Initial download roughly 187 kB gzipped, with charts and document engines
  loaded only when needed

### Installation

Two pasteable SQL files: `00_RESET_DATABASE.sql` and `01_INSTALL_ALL.sql`. The
installer is idempotent, so running it on an existing database upgrades that
database in place without data loss, and re-running after a failure is the
correct recovery action. Both were verified through clean install, re-run and
reset-then-install cycles against PostgreSQL 16.

See [SETUP.md](./SETUP.md).

---

**Powered by NegoLinks Enterprise Suite**
