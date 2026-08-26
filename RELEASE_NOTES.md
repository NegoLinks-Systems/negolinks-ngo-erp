# Release Notes

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

**A public website.** Visitors see a full marketing site — home, platform,
solutions, about, contact — plus a document verification page where anyone
holding a report can confirm it was genuinely issued by the organization.

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
