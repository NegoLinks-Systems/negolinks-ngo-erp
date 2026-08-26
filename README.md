# NegoLinks NGO & Nonprofit Management ERP

**A complete nonprofit business operating system.** Programmes, projects, grants,
donors, beneficiaries, monitoring and evaluation, finance, procurement, field
operations and governance — in one AI-powered platform.

Part of the **NegoLinks Enterprise Suite** · Version 1.0.0 · Schema 012

> Not a donor database with reports bolted on. This is the system an organization
> actually runs on, from a single community project to a multi-country portfolio.

---

## Getting started

```bash
npm install
npm run dev
```

It runs immediately with no backend — data is kept in your browser and you can
load demo data to explore every module. For a real deployment, follow
[SETUP.md](./SETUP.md).

---

## What is included

**Programme delivery** — Programmes, projects with eight lifecycle statuses,
activities, milestones, teams and risk registers.

**Funding** — A nine-stage grant pipeline from opportunity to closeout, with
disbursement tranches, a donor reporting calendar and compliance tracking.
Donors, campaigns, donations and pledges.

**People served** — Beneficiary registration with privacy controls and
one-click anonymization, households, enrolment, service delivery records and
case management with a notes timeline.

**Evidence** — Indicators with baselines, targets and disaggregated results;
logical frameworks across the full results chain; evaluations and surveys; a
learning repository for lessons and success stories.

**Field operations** — GPS-tagged monitoring, verification and distribution
visits, with offline capture for locations where the network drops out.

**Money** — Fund accounting separating restricted from unrestricted, a nonprofit
chart of accounts, budget versus actual, general ledger and bank accounts.

**Operations** — Procurement with requisitions, quotations and purchase orders;
inventory and stock movements; a fixed asset register; vehicle fleet with
document expiry tracking.

**Governance** — Board meetings and resolutions, policies, a statutory
compliance calendar, an organizational risk register and an immutable audit trail.

**Intelligence** — An Executive Assistant that answers questions across your
data, Smart Insights on every dashboard, document drafting, forecasting and
anomaly detection.

**Everything else** — Versioned documents with QR verification codes, reporting
to PDF, Word, Excel and CSV, a universal search palette, a notification centre,
role-based dashboards, a public REST API and webhooks.

---

## Technology

React 19 · TypeScript · Vite · Tailwind CSS · Supabase (PostgreSQL) · Recharts
· TanStack Query · Zustand

**Security.** Row level security is enabled and forced on all 72 tables, with 286
policies. The audit log has no update or delete policy, so entries cannot be
altered or removed. Tenant isolation is verified by an automated test, not
asserted.

**Performance.** Routes are lazily loaded and the document engines load only when
an export is requested, keeping the initial download to roughly 187 kB gzipped —
which matters on the connections field teams actually work from.

**Reach.** English, French, Arabic and Portuguese, with right-to-left support.
Multi-currency. Mobile-first layouts throughout.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run test` | Unit and component tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:e2e` | Playwright end-to-end tests |

---

## Verifying the database yourself

The SQL shipped here was executed against PostgreSQL 16 before release. You can
reproduce that verification — including proof that one organization cannot read
another's records — using the harness in [`docs/testing/`](./docs/testing/README.md).

---

## Project layout

```
src/
  components/    Shared UI, charts, application shell
  pages/         Public site, authentication, and every module
  lib/           Data access, documents, demo data, AI client
  stores/        Application state
  i18n/          Translations
  __tests__/     Unit and component tests
  e2e/           Playwright journeys
supabase/
  migrations/    Numbered schema migrations
  sql/           Two pasteable install files
  functions/     Edge Functions
docs/testing/    Database verification harness
```

---

## Licence and support

Licensed to your organization by **NEGO LINKS SYSTEMS LTD**. All rights reserved.

support@negolinks.com · [negolinks.com](https://negolinks.com)

**Powered by NegoLinks Enterprise Suite**
