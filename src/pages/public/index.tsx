import { useState, type FC } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  FolderKanban,
  HandCoins,
  HandHeart,
  HeartHandshake,
  Landmark,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { PublicLayout } from '@/components/public/PublicLayout'
import { BRAND, PRODUCT, env } from '@/constants'
import { repository } from '@/lib/repository'
import { TABLES } from '@/lib/tables'
import { formatDate } from '@/lib/utils'
import type { DocumentRecord } from '@/types'

/* ------------------------------------------------------------- shared */

const Hero: FC = () => (
  <section className="relative overflow-hidden border-b border-line">
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(60% 60% at 25% 10%, var(--accent-glow), transparent 70%), radial-gradient(50% 50% at 85% 60%, rgba(167,139,250,0.10), transparent 70%)',
      }}
    />
    <div className="relative mx-auto w-full max-w-content px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-3xl">
        <span
          className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ borderColor: 'var(--accent-border)', color: 'var(--accent-light)' }}
        >
          <Sparkles size={12} /> {PRODUCT.tagline}
        </span>
        <h1 className="font-display text-4xl font-black leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
          The complete operating system for{' '}
          <span className="nl-accent-text">nonprofit organizations</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
          Manage programmes, projects, grants, donors, beneficiaries, monitoring and evaluation, finance,
          procurement, field operations and governance from one intelligent platform — built for
          organizations working from a single community to an entire continent.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/donate" className="nl-btn nl-btn-primary px-6">
            <HandHeart size={16} /> Donate now
          </Link>
          <Link to="/platform" className="nl-btn nl-btn-ghost px-6">
            Explore the platform
          </Link>
          <Link to="/login" className="nl-btn nl-btn-ghost px-6">
            Sign in <ArrowRight size={16} />
          </Link>
        </div>
        <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ['30+', 'Integrated modules'],
            ['9-stage', 'Grant pipeline'],
            ['Multi', 'Currency & language'],
            ['AI-first', 'Every module'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="nl-accent-text font-display text-2xl font-black">{value}</dt>
              <dd className="mt-0.5 text-xs text-ink-3">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </section>
)

const MODULE_CARDS = [
  { icon: FolderKanban, title: 'Programmes & Projects', body: 'Full lifecycle from proposal to closure, with activities, milestones, teams, risks and budget tracking.' },
  { icon: HandCoins, title: 'Grants Management', body: 'Nine-stage pipeline from opportunity to closeout, with disbursements, reporting calendars and compliance alerts.' },
  { icon: HeartHandshake, title: 'Donors & Fundraising', body: 'Donor relationships, giving history, campaigns, pledges and acknowledgements in one register.' },
  { icon: UsersRound, title: 'Beneficiaries & Cases', body: 'Registration, households, enrolment, service delivery and case management with privacy controls and anonymization.' },
  { icon: BarChart3, title: 'Monitoring & Evaluation', body: 'Indicators with baselines and targets, disaggregated results, evaluations, surveys and a learning repository.' },
  { icon: Target, title: 'Logical Framework', body: 'Goal, impact, outcomes, outputs and activities with means of verification and assumptions.' },
  { icon: Wallet, title: 'Fund Accounting', body: 'Restricted and unrestricted funds, chart of accounts, budget versus actual, payables, receivables and petty cash.' },
  { icon: MapPinned, title: 'Field Operations', body: 'GPS-tagged visits, verification, distribution records and offline-ready capture for low-connectivity locations.' },
  { icon: Package, title: 'Procurement & Inventory', body: 'Requisitions, quotations, purchase orders, warehouses, stock movements and asset registers.' },
  { icon: Truck, title: 'Fleet Management', body: 'Vehicles, drivers, trips, fuel, maintenance schedules and expiring documentation.' },
  { icon: Landmark, title: 'Governance & Compliance', body: 'Board meetings, resolutions, policies, statutory calendar, risk register and audit trail.' },
  { icon: Sparkles, title: 'Intelligence Engine', body: 'Executive assistant, smart insights, forecasting and document drafting grounded in your own data.' },
]

/* -------------------------------------------------------------- pages */

export const HomePage: FC = () => (
  <PublicLayout>
    <Hero />

    <section className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 lg:py-20">
      <div className="mb-10 max-w-2xl">
        <p className="nl-section-title mb-2">One platform</p>
        <h2 className="font-display text-3xl font-bold text-ink">Everything a nonprofit runs on</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Most organizations stitch together spreadsheets, a donor database and a folder of reports.
          This platform replaces all of it with modules that share the same records, so a grant, its
          project, its budget and the people it reached are always connected.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <article key={card.title} className="nl-card p-6 transition-transform hover:-translate-y-1">
            <span
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
            >
              <card.icon size={20} />
            </span>
            <h3 className="font-display text-base font-bold text-ink">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{card.body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="nl-section-title mb-2">Built for the field</p>
          <h2 className="font-display text-3xl font-bold text-ink">Designed around how development work actually happens</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Field officers work where connectivity is unreliable. Finance teams answer to several donors
            with different rules. Programme managers report against a logframe while the board asks about
            risk. The platform is shaped around those realities rather than a generic CRM.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Offline-capable field data capture that syncs when a signal returns',
              'Restricted and unrestricted fund accounting, per donor and per project',
              'Beneficiary privacy controls, consent tracking and one-click anonymization',
              'Donor-ready PDF, Word and Excel reporting with verification codes',
              'Role-based dashboards for directors, programme, finance, MEL and field staff',
            ].map((point) => (
              <li key={point} className="flex gap-3 text-sm text-ink-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="nl-card overflow-hidden p-0">
          <div className="border-b border-line p-5">
            <p className="nl-section-title">Executive dashboard</p>
            <p className="mt-1 text-xs text-ink-3">A live view of the whole organization</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              ['Active projects', '24'],
              ['Beneficiaries reached', '48,210'],
              ['Funds utilized', '68%'],
              ['Grants expiring', '5'],
              ['Pending approvals', '12'],
              ['Compliance status', 'Healthy'],
            ].map(([label, value]) => (
              <div key={label} className="bg-card p-5">
                <p className="text-[10px] uppercase tracking-wider text-ink-3">{label}</p>
                <p className="nl-accent-text mt-1 font-display text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="p-5" style={{ borderTop: '1px solid var(--bg-border)' }}>
            <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>
              <Sparkles size={13} /> Smart Insights
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">
              Three grants expire within 90 days representing a significant share of restricted income.
              Two projects are tracking below their delivery schedule. Budget utilization on the education
              portfolio is ahead of elapsed time.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto w-full max-w-content px-4 py-16 text-center sm:px-6 lg:py-20">
      <h2 className="font-display text-3xl font-bold text-ink">Ready to see your organization in one place?</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-ink-2">
        Sign in to your workspace, or talk to our team about deploying the platform for your organization.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/donate" className="nl-btn nl-btn-primary px-6">
          <HandHeart size={16} /> Support our work
        </Link>
        <Link to="/contact" className="nl-btn nl-btn-ghost px-6">
          Contact us
        </Link>
      </div>
    </section>
  </PublicLayout>
)

export const PlatformPage: FC = () => (
  <PublicLayout>
    <section className="border-b border-line">
      <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <p className="nl-section-title mb-2">The platform</p>
        <h1 className="max-w-3xl font-display text-4xl font-black text-ink">
          Thirty integrated modules, one shared record of truth
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">
          Every module writes to the same organizational database, so a donor commitment flows into a
          grant, a grant funds a project, a project reaches beneficiaries, and the indicators, budget
          lines and field visits all reconcile back to the same records.
        </p>
      </div>
    </section>

    <section className="mx-auto w-full max-w-content px-4 py-14 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: 'AI in every module',
            points: [
              'Executive Assistant answering questions across all your data',
              'Smart Insights on every dashboard',
              'Document and narrative drafting for donor reports',
              'Forecasting for funding gaps and burn rate',
              'Anomaly detection across transactions and indicators',
            ],
          },
          {
            icon: ShieldCheck,
            title: 'Enterprise security',
            points: [
              'Row-level security on every table',
              'Role-based access with granular permissions',
              'Complete, immutable audit trail',
              'Beneficiary data privacy and anonymization',
              'Encrypted credentials, never exposed to the browser',
            ],
          },
          {
            icon: Building2,
            title: 'Built to scale',
            points: [
              'Multi-branch and multi-office structures',
              'Multi-currency with exchange-rate handling',
              'English, French, Arabic and Portuguese',
              'Public API and webhooks for integration',
              'Scheduled backups and disaster recovery',
            ],
          },
        ].map((column) => (
          <div key={column.title} className="nl-card p-6">
            <span
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
            >
              <column.icon size={20} />
            </span>
            <h3 className="font-display text-base font-bold text-ink">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-ink-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <article key={card.title} className="nl-card p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <card.icon size={17} style={{ color: 'var(--accent-primary)' }} />
              <h3 className="font-display text-sm font-bold text-ink">{card.title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-2">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  </PublicLayout>
)

export const SolutionsPage: FC = () => (
  <PublicLayout>
    <section className="border-b border-line">
      <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <p className="nl-section-title mb-2">Solutions</p>
        <h1 className="max-w-3xl font-display text-4xl font-black text-ink">Who the platform is built for</h1>
      </div>
    </section>

    <section className="mx-auto w-full max-w-content px-4 py-14 sm:px-6">
      <div className="grid gap-6 md:grid-cols-2">
        {[
          ['Local and national NGOs', 'Run programmes, satisfy donor reporting requirements and demonstrate impact without a large back-office team.'],
          ['International NGOs', 'Coordinate country offices, consolidate multi-currency finance and roll up indicators across a global portfolio.'],
          ['Foundations and grant-makers', 'Track the grants you award, monitor grantee reporting and measure the outcomes your funding produced.'],
          ['Faith-based organizations', 'Manage congregational giving, community programmes, volunteers and charitable operations in one register.'],
          ['Community-based organizations', 'Start with beneficiaries, projects and simple finance, then switch on modules as the organization grows.'],
          ['Humanitarian responders', 'Register affected households rapidly, capture distributions offline and report to pooled funds with evidence.'],
          ['Research and advocacy bodies', 'Structure evaluations, surveys and a knowledge repository alongside project and funding management.'],
          ['Government social programmes', 'Administer beneficiary registers, service delivery and compliance across multiple implementing offices.'],
        ].map(([title, body]) => (
          <article key={title} className="nl-card p-6">
            <h3 className="font-display text-base font-bold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
          </article>
        ))}
      </div>
    </section>
  </PublicLayout>
)

export const AboutPage: FC = () => (
  <PublicLayout>
    <section className="border-b border-line">
      <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <p className="nl-section-title mb-2">About</p>
        <h1 className="max-w-3xl font-display text-4xl font-black text-ink">
          Enterprise software built for organizations that serve people
        </h1>
      </div>
    </section>

    <section className="mx-auto w-full max-w-content px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-ink-2">
            {PRODUCT.name} is part of the {BRAND.suite} — a family of enterprise platforms covering
            construction, logistics, retail, manufacturing, cooperatives, restaurants, mining and more.
            Each product shares the same architecture, security model and intelligence engine, so an
            organization running more than one can expect the same standards throughout.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            The suite is built by {BRAND.legalName}, an ICT and software solutions company delivering
            enterprise platforms, ERPs, websites and mobile applications. The nonprofit product was
            designed with the specific realities of development and humanitarian work in view: donor
            compliance, restricted funding, beneficiary privacy, and delivery in places where the
            network drops out.
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-ink">Principles</h2>
          <ul className="mt-4 space-y-4">
            {[
              ['Data belongs to the organization', 'Your records are yours. Export any module to PDF, Excel, CSV or JSON at any time, and take full backups on your own schedule.'],
              ['Privacy by default', 'Beneficiary records carry access controls, consent tracking and anonymization. Sensitive fields are visible only to roles that need them.'],
              ['Evidence over assertion', 'Indicators, logframes, field verification and an immutable audit trail mean impact claims can be traced back to source records.'],
              ['Works where the work happens', 'Mobile-first layouts, offline capture and low-bandwidth performance, because programme delivery does not wait for good connectivity.'],
            ].map(([title, body]) => (
              <li key={title}>
                <p className="font-display text-sm font-bold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="nl-card h-fit p-6">
          <p className="nl-section-title mb-3">At a glance</p>
          <dl className="space-y-3 text-sm">
            {[
              ['Product', PRODUCT.name],
              ['Suite', BRAND.suite],
              ['Company', BRAND.legalName],
              ['Website', 'negolinks.com'],
              ['Support', env.supportEmail],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wider text-ink-3">{label}</dt>
                <dd className="text-ink-2">{value}</dd>
              </div>
            ))}
          </dl>
          <a href={BRAND.website} target="_blank" rel="noreferrer" className="nl-btn nl-btn-ghost mt-5 w-full">
            Visit negolinks.com
          </a>
        </aside>
      </div>
    </section>
  </PublicLayout>
)

export const ContactPage: FC = () => {
  const [sent, setSent] = useState(false)

  return (
    <PublicLayout>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
          <p className="nl-section-title mb-2">Contact</p>
          <h1 className="max-w-3xl font-display text-4xl font-black text-ink">Talk to our team</h1>
          <p className="mt-3 max-w-xl text-sm text-ink-2">
            Tell us about your organization and what you need the platform to do. We will respond with a
            deployment plan and timeline.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-content px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="nl-card p-6 lg:col-span-2">
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="font-display text-lg font-bold text-ink">Thank you — your message is ready to send</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
                  Your email client should have opened with the details filled in. If it did not, write to us
                  directly at {env.supportEmail}.
                </p>
                <button type="button" className="nl-btn nl-btn-ghost mt-5" onClick={() => setSent(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  const subject = `Platform enquiry — ${String(form.get('organization') ?? '')}`
                  const body = [
                    `Name: ${String(form.get('name') ?? '')}`,
                    `Organization: ${String(form.get('organization') ?? '')}`,
                    `Email: ${String(form.get('email') ?? '')}`,
                    `Phone: ${String(form.get('phone') ?? '')}`,
                    `Organization size: ${String(form.get('size') ?? '')}`,
                    '',
                    String(form.get('message') ?? ''),
                  ].join('\n')
                  window.location.href = `mailto:${env.supportEmail}?subject=${encodeURIComponent(
                    subject,
                  )}&body=${encodeURIComponent(body)}`
                  setSent(true)
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="nl-label" htmlFor="name">Your name</label>
                    <input id="name" name="name" required className="nl-input" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="nl-label" htmlFor="organization">Organization</label>
                    <input id="organization" name="organization" required className="nl-input" placeholder="Organization name" />
                  </div>
                  <div>
                    <label className="nl-label" htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required className="nl-input" placeholder="you@organization.org" />
                  </div>
                  <div>
                    <label className="nl-label" htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" className="nl-input" placeholder="+234 …" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="nl-label" htmlFor="size">Organization size</label>
                    <select id="size" name="size" className="nl-input">
                      <option>Under 20 staff</option>
                      <option>20 – 100 staff</option>
                      <option>100 – 500 staff</option>
                      <option>Over 500 staff</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="nl-label" htmlFor="message">How can we help?</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      className="nl-input resize-y"
                      placeholder="Tell us about your programmes, donors and what you need to manage."
                    />
                  </div>
                </div>
                <button type="submit" className="nl-btn nl-btn-primary mt-5 w-full sm:w-auto sm:px-8">
                  Send message <ArrowRight size={15} />
                </button>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="nl-card p-6">
              <p className="nl-section-title mb-3">Direct</p>
              <p className="text-sm text-ink-2">
                <a href={`mailto:${env.supportEmail}`} className="hover:text-accent-light">{env.supportEmail}</a>
              </p>
              <p className="mt-1 text-sm text-ink-2">
                <a href={`tel:${env.supportPhone.replace(/\s/g, '')}`} className="hover:text-accent-light">{env.supportPhone}</a>
              </p>
            </div>
            <div className="nl-card p-6">
              <p className="nl-section-title mb-3">Already a customer?</p>
              <p className="text-sm text-ink-2">Sign in to your organization's workspace.</p>
              <Link to="/login" className="nl-btn nl-btn-primary mt-4 w-full">Sign in</Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  )
}

/* --------------------------------------------------- document verify */

export const VerifyPage: FC = () => {
  const params = useParams<{ code?: string }>()
  const [code, setCode] = useState(params.code ?? '')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<DocumentRecord | null | undefined>(undefined)

  const verify = async (value: string): Promise<void> => {
    if (!value.trim()) return
    setChecking(true)
    try {
      const rows = await repository.list<DocumentRecord>(TABLES.documents, {
        filters: { verification_code: value.trim().toUpperCase() },
        limit: 1,
      })
      setResult(rows[0] ?? null)
      if (!rows.length) toast.error('No document matched that verification code.')
    } catch {
      setResult(null)
      toast.error('Verification is unavailable right now.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <span
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
        >
          <FileSearch size={22} />
        </span>
        <h1 className="font-display text-3xl font-black text-ink">Verify a document</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Every document issued by this platform carries a verification code and QR code. Enter the code
          printed in the document footer to confirm it was issued by the organization and has not been
          altered.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="nl-input pl-9 uppercase"
              placeholder="NGO-XXXXXX-XXXXX"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void verify(code)
              }}
            />
          </div>
          <button
            type="button"
            className="nl-btn nl-btn-primary sm:px-8"
            onClick={() => void verify(code)}
            disabled={checking || !code.trim()}
          >
            {checking ? 'Checking…' : 'Verify'}
          </button>
        </div>

        {result === null ? (
          <div
            className="mt-6 rounded-xl p-5"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            <p className="font-display text-sm font-bold text-danger">No matching document</p>
            <p className="mt-1 text-xs text-ink-2">
              This code was not found. Check that it was entered exactly as printed, or contact the issuing
              organization directly.
            </p>
          </div>
        ) : null}

        {result ? (
          <div className="nl-card mt-6 p-6" style={{ borderColor: 'var(--accent-border)' }}>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color: '#22C55E' }} />
              <p className="font-display text-sm font-bold text-ink">Document verified</p>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ['Title', result.title],
                ['Type', result.doc_type],
                ['Category', result.category],
                ['Version', String(result.version)],
                ['Status', result.status],
                ['Issued', formatDate(result.created_at)],
                ['Verification code', result.verification_code],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                  <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
                  <dd className="text-right text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>
    </PublicLayout>
  )
}

export const NotFoundPage: FC = () => (
  <PublicLayout>
    <section className="mx-auto w-full max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="nl-accent-text font-display text-6xl font-black">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-2">
        The page you are looking for does not exist or may have moved.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link to="/" className="nl-btn nl-btn-primary px-6">Back to home</Link>
        <Link to="/app" className="nl-btn nl-btn-ghost px-6">Open workspace</Link>
      </div>
    </section>
  </PublicLayout>
)
