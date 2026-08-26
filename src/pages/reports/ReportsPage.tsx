import { useMemo, useState, type FC } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  HeartHandshake,
  Loader2,
  Megaphone,
  ScrollText,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import { ModulePage } from '@/components/negolinks/ModulePage'
import {
  Badge,
  ChartCard,
  EmptyState,
  KPICard,
  KPICardGrid,
  NegoModal,
  PageHeader,
  ProgressBar,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { ComparisonBars, DonutChart, TrendChart } from '@/components/charts'
import { useCollection, useUpdateRecord } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { useAppStore } from '@/stores/app.store'
import { aiClient } from '@/lib/ai/client'
import {
  downloadCsv,
  downloadDocx,
  downloadPdf,
  downloadXlsx,
  makeVerificationCode,
  type DocumentBlock,
} from '@/lib/documents'
import {
  daysBetween,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  groupBy,
  percentOf,
  sum,
  titleCase,
  toMajor,
} from '@/lib/utils'
import type {
  Beneficiary,
  CalendarEvent,
  Campaign,
  Donation,
  DocumentRecord,
  Donor,
  Grant,
  Indicator,
  Project,
  PurchaseRequest,
  Transaction,
} from '@/types'

const optionsOf = (values: string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* --------------------------------------------------------- Fundraising */

export const FundraisingPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const { data: campaigns = [], isLoading } = useCollection<Campaign>(TABLES.campaigns)
  const { data: donations = [] } = useCollection<Donation>(TABLES.donations)
  const [tab, setTab] = useState('campaigns')

  const metrics = useMemo(() => {
    const raised = sum(donations.filter((d) => d.status === 'received'), (d) => d.amount_minor)
    const pledged = sum(donations.filter((d) => d.status === 'pledged'), (d) => d.amount_minor)
    const target = sum(campaigns, (c) => c.target_minor)
    const overduePledges = donations.filter(
      (d) => d.status === 'pledged' && d.pledge_due_on && daysBetween(new Date(), d.pledge_due_on) < 0,
    )
    return { raised, pledged, target, overduePledges, donorCount: new Set(donations.map((d) => d.donor_name)).size }
  }, [campaigns, donations])

  const trend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
      return { key: `${date.getFullYear()}-${date.getMonth()}`, name: MONTHS[date.getMonth()] as string }
    })
    const totals = new Map<string, number>()
    donations
      .filter((d) => d.received_on)
      .forEach((donation) => {
        const date = new Date(donation.received_on as string)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        totals.set(key, (totals.get(key) ?? 0) + toMajor(donation.amount_minor))
      })
    return months.map((month) => ({ name: month.name, received: Math.round(totals.get(month.key) ?? 0) }))
  }, [donations])

  const aiContext = useMemo(
    () =>
      [
        `Fundraising: ${campaigns.length} campaigns with a combined target of ${formatCurrency(metrics.target, currency)}.`,
        `Received ${formatCurrency(metrics.raised, currency)} from ${donations.filter((d) => d.status === 'received').length} donations. Outstanding pledges ${formatCurrency(metrics.pledged, currency)}, of which ${metrics.overduePledges.length} are overdue.`,
        ...campaigns.map(
          (c) =>
            `Campaign ${c.name} (${c.channel}) — target ${formatCurrency(c.target_minor, c.currency)}, raised ${formatCurrency(c.raised_minor, c.currency)} (${Math.round(percentOf(c.raised_minor, c.target_minor))}%), status ${c.status}.`,
        ),
      ].join('\n'),
    [campaigns, donations, metrics, currency],
  )

  return (
    <AppShell aiModule="fundraising" aiContext={aiContext}>
      <PageHeader
        title="Fundraising"
        subtitle="Campaigns, donations, pledges and giving performance"
        icon={Megaphone}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Fundraising' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Funds raised" value={formatCompactCurrency(metrics.raised, currency)} icon={Wallet} hint={`Target ${formatCompactCurrency(metrics.target, currency)}`} loading={isLoading} />
        <KPICard title="Outstanding pledges" value={formatCompactCurrency(metrics.pledged, currency)} icon={Target} hint={`${metrics.overduePledges.length} overdue`} loading={isLoading} />
        <KPICard title="Donations" value={formatNumber(donations.length)} icon={HeartHandshake} hint={`${metrics.donorCount} distinct givers`} loading={isLoading} />
        <KPICard
          title="Target achievement"
          value={`${Math.round(percentOf(metrics.raised, metrics.target))}%`}
          icon={TrendingUp}
          loading={isLoading}
        />
      </KPICardGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Giving over time" subtitle="Donations received, last twelve months" className="lg:col-span-2">
          <TrendChart
            data={trend}
            series={[{ key: 'received', label: 'Received', color: '#22C55E' }]}
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
        <ChartCard title="Channel mix" subtitle="Campaigns by channel">
          {campaigns.length ? (
            <DonutChart
              data={Object.entries(groupBy(campaigns, (c) => c.channel)).map(([name, list]) => ({ name, value: list.length }))}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No campaigns yet.</p>
          )}
        </ChartCard>
      </div>

      <TabBar
        tabs={[
          { key: 'campaigns', label: 'Campaigns', count: campaigns.length },
          { key: 'donations', label: 'Donations & pledges', count: donations.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'campaigns' ? (
        <DataTable<Campaign>
          data={campaigns}
          loading={isLoading}
          exportName="campaigns"
          exportTitle="Fundraising Campaigns"
          columns={[
            { key: 'name', header: 'Campaign', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
            { key: 'channel', header: 'Channel' },
            {
              key: 'target_minor',
              header: 'Target',
              align: 'right',
              value: (row) => row.target_minor,
              render: (row) => formatCurrency(row.target_minor, row.currency),
            },
            {
              key: 'raised_minor',
              header: 'Raised',
              align: 'right',
              value: (row) => row.raised_minor,
              render: (row) => <span className="font-semibold text-success">{formatCurrency(row.raised_minor, row.currency)}</span>,
            },
            {
              key: 'achievement',
              header: 'Achievement',
              value: (row) => percentOf(row.raised_minor, row.target_minor),
              render: (row) => <ProgressBar value={percentOf(row.raised_minor, row.target_minor)} showLabel className="min-w-[110px]" />,
            },
            { key: 'end_date', header: 'Ends', render: (row) => formatDate(row.end_date) },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
        />
      ) : (
        <DataTable<Donation>
          data={donations}
          exportName="donations"
          exportTitle="Donations and Pledges"
          columns={[
            { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs text-ink">{row.reference}</span> },
            { key: 'donor_name', header: 'Donor', render: (row) => (row.is_anonymous ? <em className="text-ink-3">Anonymous</em> : row.donor_name) },
            { key: 'donation_type', header: 'Type', render: (row) => titleCase(row.donation_type) },
            {
              key: 'amount_minor',
              header: 'Amount',
              align: 'right',
              value: (row) => row.amount_minor,
              render: (row) => formatCurrency(row.amount_minor, row.currency),
            },
            { key: 'received_on', header: 'Received', render: (row) => formatDate(row.received_on ?? row.pledge_due_on) },
            { key: 'payment_method', header: 'Method', hideOnMobile: true },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            { key: 'status', label: 'Status', options: optionsOf(['pledged', 'received', 'cancelled']), match: (row, value) => row.status === value },
            { key: 'type', label: 'Type', options: optionsOf(['donation', 'pledge']), match: (row, value) => row.donation_type === value },
          ]}
        />
      )}
    </AppShell>
  )
}

/* ---------------------------------------------------------- Documents */

export const DocumentsPage: FC = () => (
  <ModulePage<DocumentRecord>
    title="Documents"
    subtitle="Versioned document repository with access levels and verification codes"
    icon={FileText}
    aiModule="documents"
    table={TABLES.documents}
    recordLabel="Document"
    columns={[
      { key: 'title', header: 'Document', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { key: 'doc_type', header: 'Type' },
      { key: 'category', header: 'Category' },
      { key: 'version', header: 'Version', align: 'center', render: (row) => `v${row.version}` },
      {
        key: 'access_level',
        header: 'Access',
        render: (row) => (
          <Badge tone={row.access_level === 'confidential' ? 'danger' : row.access_level === 'restricted' ? 'warning' : 'neutral'}>
            {titleCase(row.access_level)}
          </Badge>
        ),
      },
      {
        key: 'verification_code',
        header: 'Verification',
        hideOnMobile: true,
        render: (row) => <span className="font-mono text-[11px] text-ink-3">{row.verification_code}</span>,
      },
      { key: 'created_at', header: 'Created', render: (row) => formatDate(row.created_at) },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'access',
        label: 'Access level',
        options: optionsOf(['public', 'internal', 'restricted', 'confidential']),
        match: (row, value) => row.access_level === value,
      },
      {
        key: 'status',
        label: 'Status',
        options: optionsOf(['draft', 'final', 'signed', 'archived']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'title', label: 'Document title', type: 'text', required: true, full: true },
      { name: 'doc_type', label: 'Document type', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text', required: true },
      { name: 'version', label: 'Version', type: 'number', defaultValue: 1 },
      {
        name: 'access_level',
        label: 'Access level',
        type: 'select',
        defaultValue: 'internal',
        options: optionsOf(['public', 'internal', 'restricted', 'confidential']),
      },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: optionsOf(['draft', 'final', 'signed', 'archived']) },
      { name: 'content', label: 'Content or summary', type: 'textarea', full: true },
    ]}
    beforeSave={(values) => ({
      ...values,
      verification_code: makeVerificationCode(),
      ai_generated: false,
    })}
    kpis={(rows) => [
      { label: 'Documents', value: formatNumber(rows.length), icon: FileText },
      { label: 'Finalized', value: formatNumber(rows.filter((r) => ['final', 'signed'].includes(r.status)).length), icon: CheckCircle2 },
      { label: 'Confidential', value: formatNumber(rows.filter((r) => r.access_level === 'confidential').length), icon: ClipboardCheck },
      { label: 'AI generated', value: formatNumber(rows.filter((r) => r.ai_generated).length), icon: Sparkles },
    ]}
    aiContext={(rows) =>
      [
        `Documents: ${rows.length} in the repository.`,
        ...rows.slice(0, 50).map((r) => `${r.title} (${r.doc_type}, ${r.category}) — v${r.version}, ${r.status}, access ${r.access_level}, code ${r.verification_code}.`),
      ].join('\n')
    }
  />
)

/* ----------------------------------------------------------- Calendar */

export const CalendarPage: FC = () => {
  const { data: events = [], isLoading } = useCollection<CalendarEvent>(TABLES.calendar)
  const [month, setMonth] = useState(() => new Date())

  const monthEvents = useMemo(
    () =>
      events.filter((event) => {
        const date = new Date(event.start_at)
        return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
      }),
    [events, month],
  )

  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const leading = first.getDay()
    const cells: (number | null)[] = Array.from({ length: leading }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
    return cells
  }, [month])

  const eventsOn = (day: number): CalendarEvent[] =>
    monthEvents.filter((event) => new Date(event.start_at).getDate() === day)

  const aiContext = useMemo(
    () =>
      events
        .slice(0, 60)
        .map((event) => `${event.title} — ${titleCase(event.event_type)} on ${formatDate(event.start_at)}${event.location ? ` at ${event.location}` : ''}.`)
        .join('\n'),
    [events],
  )

  const today = new Date()

  return (
    <AppShell aiModule="dashboard" aiContext={aiContext}>
      <PageHeader
        title="Calendar"
        subtitle="Deadlines, meetings, field visits and reporting dates"
        icon={CalendarDays}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Calendar' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="nl-btn nl-btn-subtle"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              Previous
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-ink">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button
              type="button"
              className="nl-btn nl-btn-subtle"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="nl-skeleton h-96 rounded-xl" />
      ) : (
        <div className="nl-card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-ink-3">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day, index) => {
              const dayEvents = day ? eventsOn(day) : []
              const isToday =
                day === today.getDate() &&
                month.getMonth() === today.getMonth() &&
                month.getFullYear() === today.getFullYear()
              return (
                <div
                  key={index}
                  className="min-h-[92px] border-b border-r border-line p-1.5 last:border-r-0"
                  style={isToday ? { background: 'var(--accent-glow)' } : undefined}
                >
                  {day ? (
                    <>
                      <span
                        className={`text-[11px] font-semibold ${isToday ? 'text-accent-light' : 'text-ink-3'}`}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="truncate rounded px-1.5 py-0.5 text-[10px]"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent-light)' }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 ? (
                          <p className="px-1 text-[10px] text-ink-3">+{dayEvents.length - 3} more</p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <DataTable<CalendarEvent>
          data={[...events].sort((a, b) => a.start_at.localeCompare(b.start_at))}
          exportName="calendar"
          exportTitle="Organizational Calendar"
          columns={[
            { key: 'title', header: 'Event', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            { key: 'event_type', header: 'Type', render: (row) => <Badge tone="accent">{titleCase(row.event_type)}</Badge> },
            { key: 'start_at', header: 'Date', render: (row) => formatDate(row.start_at) },
            { key: 'location', header: 'Location' },
            {
              key: 'countdown',
              header: 'When',
              value: (row) => daysBetween(new Date(), row.start_at),
              render: (row) => {
                const days = daysBetween(new Date(), row.start_at)
                return days === 0 ? 'Today' : days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`
              },
            },
          ]}
        />
      </div>
    </AppShell>
  )
}

/* ---------------------------------------------------------- Approvals */

export const ApprovalsPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const can = useAppStore((state) => state.can)
  const { data: requests = [], isLoading } = useCollection<PurchaseRequest>(TABLES.purchaseRequests)
  const update = useUpdateRecord<Record<string, unknown>>(TABLES.purchaseRequests, 'Request')

  const pending = requests.filter((request) => request.status === 'pending_approval')
  const decided = requests.filter((request) => ['approved', 'rejected'].includes(request.status))

  const aiContext = useMemo(
    () =>
      [
        `Approvals: ${pending.length} items awaiting decision worth ${formatCurrency(sum(pending, (r) => r.estimated_minor), currency)}.`,
        ...pending.map((r) => `${r.reference} — ${r.title}, ${formatCurrency(r.estimated_minor, r.currency)}, needed by ${formatDate(r.needed_by)}.`),
      ].join('\n'),
    [pending, currency],
  )

  const decide = (id: string, status: 'approved' | 'rejected'): void => {
    update.mutate(
      { id, changes: { status } },
      { onSuccess: () => toast.success(status === 'approved' ? 'Request approved' : 'Request rejected') },
    )
  }

  return (
    <AppShell aiModule="procurement" aiContext={aiContext}>
      <PageHeader
        title="Approvals"
        subtitle="Items routed to you through the organization's approval workflows"
        icon={ClipboardCheck}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Approvals' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Awaiting decision" value={formatNumber(pending.length)} icon={ClipboardCheck} loading={isLoading} />
        <KPICard title="Value pending" value={formatCompactCurrency(sum(pending, (r) => r.estimated_minor), currency)} icon={Wallet} loading={isLoading} />
        <KPICard title="Approved" value={formatNumber(requests.filter((r) => r.status === 'approved').length)} icon={CheckCircle2} loading={isLoading} />
        <KPICard title="Rejected" value={formatNumber(requests.filter((r) => r.status === 'rejected').length)} icon={XCircle} loading={isLoading} />
      </KPICardGrid>

      {pending.length === 0 && !isLoading ? (
        <div className="nl-card">
          <EmptyState
            icon={CheckCircle2}
            title="Nothing awaiting your approval"
            description="Requests routed to your role will appear here with the full context needed to decide."
          />
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          {pending.map((request) => (
            <article key={request.id} className="nl-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-3">{request.reference}</span>
                  <Badge tone="warning">Pending approval</Badge>
                </div>
                <h3 className="font-display text-sm font-bold text-ink">{request.title}</h3>
                <p className="mt-1 text-xs text-ink-2">{request.justification}</p>
                <p className="mt-2 text-xs text-ink-3">
                  Estimated {formatCurrency(request.estimated_minor, request.currency)} · Needed by{' '}
                  {formatDate(request.needed_by)}
                </p>
              </div>
              {can('approve') ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="nl-btn nl-btn-subtle"
                    onClick={() => decide(request.id, 'rejected')}
                    disabled={update.isPending}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                  <button
                    type="button"
                    className="nl-btn nl-btn-primary"
                    onClick={() => decide(request.id, 'approved')}
                    disabled={update.isPending}
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                </div>
              ) : (
                <Badge tone="neutral">Awaiting an approver</Badge>
              )}
            </article>
          ))}
        </div>
      )}

      {decided.length ? (
        <>
          <h2 className="nl-section-title mb-3">Decision history</h2>
          <DataTable<PurchaseRequest>
            data={decided}
            exportName="approval-history"
            exportTitle="Approval Decision History"
            columns={[
              { key: 'reference', header: 'Reference' },
              { key: 'title', header: 'Item', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
              {
                key: 'estimated_minor',
                header: 'Value',
                align: 'right',
                value: (row) => row.estimated_minor,
                render: (row) => formatCurrency(row.estimated_minor, row.currency),
              },
              { key: 'request_date', header: 'Requested', render: (row) => formatDate(row.request_date) },
              { key: 'status', header: 'Decision', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
            ]}
          />
        </>
      ) : null}
    </AppShell>
  )
}

/* ---------------------------------------------------------- Analytics */

export const AnalyticsPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)
  const { data: grants = [] } = useCollection<Grant>(TABLES.grants)
  const { data: donors = [] } = useCollection<Donor>(TABLES.donors)
  const { data: beneficiaries = [] } = useCollection<Beneficiary>(TABLES.beneficiaries)
  const { data: indicators = [] } = useCollection<Indicator>(TABLES.indicators)
  const { data: transactions = [] } = useCollection<Transaction>(TABLES.transactions)

  const sectorPerformance = useMemo(
    () =>
      Object.entries(groupBy(projects, (project) => project.sector)).map(([name, list]) => ({
        name,
        budget: Math.round(toMajor(sum(list, (p) => p.budget_minor))),
        spent: Math.round(toMajor(sum(list, (p) => p.spent_minor))),
        reached: sum(list, (p) => p.reached_beneficiaries),
      })),
    [projects],
  )

  const costPerBeneficiary = useMemo(
    () =>
      sectorPerformance
        .filter((row) => row.reached > 0)
        .map((row) => ({ name: row.name, value: Math.round((row.spent * 100) / row.reached) }))
        .sort((a, b) => b.value - a.value),
    [sectorPerformance],
  )

  const aiContext = useMemo(
    () =>
      [
        `Analytics across ${projects.length} projects, ${grants.length} grants, ${donors.length} donors, ${formatNumber(beneficiaries.length)} beneficiaries and ${transactions.length} transactions.`,
        ...sectorPerformance.map(
          (row) =>
            `Sector ${row.name}: budget ${formatCurrency(row.budget * 100, currency)}, spent ${formatCurrency(row.spent * 100, currency)}, reached ${formatNumber(row.reached)} beneficiaries.`,
        ),
        ...costPerBeneficiary.map((row) => `Cost per beneficiary in ${row.name}: ${formatCurrency(row.value, currency)}.`),
      ].join('\n'),
    [projects.length, grants.length, donors.length, beneficiaries.length, transactions.length, sectorPerformance, costPerBeneficiary, currency],
  )

  return (
    <AppShell aiModule="dashboard" aiContext={aiContext}>
      <PageHeader
        title="Analytics"
        subtitle="Cross-module analysis of efficiency, reach and financial performance"
        icon={Gauge}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Analytics' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard
          title="Cost per beneficiary"
          value={
            sum(projects, (p) => p.reached_beneficiaries)
              ? formatCurrency(
                  Math.round(sum(projects, (p) => p.spent_minor) / sum(projects, (p) => p.reached_beneficiaries)),
                  currency,
                )
              : '—'
          }
          icon={Users}
          hint="Portfolio average"
        />
        <KPICard
          title="Programme efficiency"
          value={`${Math.round(
            percentOf(
              sum(transactions.filter((t) => t.txn_type === 'expense' && t.account_code.startsWith('5') && t.account_code !== '5600'), (t) => t.amount_minor),
              sum(transactions.filter((t) => t.txn_type === 'expense'), (t) => t.amount_minor),
            ),
          )}%`}
          icon={Gauge}
          hint="Programme versus total spend"
        />
        <KPICard
          title="Indicator achievement"
          value={`${Math.round(
            indicators.length
              ? (indicators.reduce((total, i) => total + (i.target_value ? Math.min(1, i.actual_value / i.target_value) : 0), 0) /
                  indicators.length) *
                  100
              : 0,
          )}%`}
          icon={Target}
        />
        <KPICard
          title="Funding concentration"
          value={`${Math.round(
            percentOf(
              Math.max(0, ...donors.map((d) => d.total_received_minor)),
              sum(donors, (d) => d.total_received_minor),
            ),
          )}%`}
          icon={TrendingUp}
          hint="Largest donor share"
        />
      </KPICardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sector investment and reach" subtitle="Budget against beneficiaries reached">
          {sectorPerformance.length ? (
            <ComparisonBars
              data={sectorPerformance.map((row) => ({ name: row.name, budget: row.budget, spent: row.spent }))}
              series={[
                { key: 'budget', label: 'Budget' },
                { key: 'spent', label: 'Spent', color: '#22C55E' },
              ]}
              layout="vertical"
              height={320}
              formatter={(value) => formatCompactCurrency(value * 100, currency)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No project data yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Cost per beneficiary by sector" subtitle="Lower is more efficient">
          {costPerBeneficiary.length ? (
            <ComparisonBars
              data={costPerBeneficiary.map((row) => ({ name: row.name, value: Math.round(toMajor(row.value)) }))}
              series={[{ key: 'value', label: 'Cost per beneficiary' }]}
              layout="vertical"
              height={320}
              formatter={(value) => formatCompactCurrency(value * 100, currency)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No reach data recorded yet.</p>
          )}
        </ChartCard>
      </div>
    </AppShell>
  )
}

/* ------------------------------------------------------------ Reports */

interface ReportDefinition {
  key: string
  title: string
  description: string
  build: () => { columns: string[]; rows: (string | number)[][] }
}

export const ReportsPage: FC = () => {
  const organization = useAppStore((state) => state.organization)
  const session = useAppStore((state) => state.session)
  const currency = organization?.base_currency ?? 'NGN'
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)
  const { data: grants = [] } = useCollection<Grant>(TABLES.grants)
  const { data: donors = [] } = useCollection<Donor>(TABLES.donors)
  const { data: indicators = [] } = useCollection<Indicator>(TABLES.indicators)
  const { data: transactions = [] } = useCollection<Transaction>(TABLES.transactions)
  const { data: beneficiaries = [] } = useCollection<Beneficiary>(TABLES.beneficiaries)

  const [narrativeOpen, setNarrativeOpen] = useState(false)
  const [narrative, setNarrative] = useState('')
  const [drafting, setDrafting] = useState(false)

  const reports: ReportDefinition[] = [
    {
      key: 'project-portfolio',
      title: 'Project Portfolio Report',
      description: 'Every project with budget, expenditure, progress and beneficiary reach.',
      build: () => ({
        columns: ['Code', 'Title', 'Sector', 'Status', 'Budget', 'Spent', 'Progress %', 'Reached', 'Target'],
        rows: projects.map((project) => [
          project.code,
          project.title,
          project.sector,
          titleCase(project.status),
          formatCurrency(project.budget_minor, project.currency),
          formatCurrency(project.spent_minor, project.currency),
          project.progress_percent,
          project.reached_beneficiaries,
          project.target_beneficiaries,
        ]),
      }),
    },
    {
      key: 'grant-register',
      title: 'Grant Register',
      description: 'Grant pipeline, awards, disbursements and compliance status.',
      build: () => ({
        columns: ['Code', 'Title', 'Stage', 'Requested', 'Awarded', 'Disbursed', 'Ends', 'Compliance'],
        rows: grants.map((grant) => [
          grant.code,
          grant.title,
          titleCase(grant.stage),
          formatCurrency(grant.amount_requested_minor, grant.currency),
          formatCurrency(grant.amount_awarded_minor, grant.currency),
          formatCurrency(grant.amount_disbursed_minor, grant.currency),
          formatDate(grant.end_date),
          titleCase(grant.compliance_status),
        ]),
      }),
    },
    {
      key: 'donor-statement',
      title: 'Donor Contribution Statement',
      description: 'Commitments and receipts by donor for acknowledgement and reconciliation.',
      build: () => ({
        columns: ['Donor', 'Type', 'Country', 'Committed', 'Received', 'Outstanding', 'Status'],
        rows: donors.map((donor) => [
          donor.name,
          donor.donor_type,
          donor.country ?? '',
          formatCurrency(donor.total_committed_minor, donor.currency),
          formatCurrency(donor.total_received_minor, donor.currency),
          formatCurrency(donor.total_committed_minor - donor.total_received_minor, donor.currency),
          titleCase(donor.status),
        ]),
      }),
    },
    {
      key: 'indicator-performance',
      title: 'Indicator Performance Report',
      description: 'Baseline, target and actual for every indicator in the results framework.',
      build: () => ({
        columns: ['Code', 'Indicator', 'Level', 'Unit', 'Baseline', 'Target', 'Actual', 'Achievement %'],
        rows: indicators.map((indicator) => [
          indicator.code,
          indicator.name,
          titleCase(indicator.level),
          indicator.unit,
          indicator.baseline_value,
          indicator.target_value,
          indicator.actual_value,
          Math.round(percentOf(indicator.actual_value, indicator.target_value)),
        ]),
      }),
    },
    {
      key: 'financial-summary',
      title: 'Financial Summary',
      description: 'Posted income and expenditure by account for the reporting period.',
      build: () => {
        const grouped = groupBy(
          transactions.filter((t) => t.status === 'posted'),
          (t) => `${t.account_code}|${t.txn_type}`,
        )
        return {
          columns: ['Account', 'Type', 'Entries', 'Total'],
          rows: Object.entries(grouped).map(([key, list]) => {
            const [code, type] = key.split('|')
            return [code ?? '', titleCase(type ?? ''), list.length, formatCurrency(sum(list, (t) => t.amount_minor), currency)]
          }),
        }
      },
    },
    {
      key: 'beneficiary-summary',
      title: 'Beneficiary Reach Summary',
      description: 'Disaggregated reach by community, gender and status.',
      build: () => {
        const grouped = groupBy(beneficiaries, (b) => b.community ?? 'Unspecified')
        return {
          columns: ['Community', 'State', 'Total', 'Female', 'Male', 'Children', 'Active'],
          rows: Object.entries(grouped).map(([community, list]) => [
            community,
            list[0]?.state ?? '',
            list.length,
            list.filter((b) => b.gender === 'female').length,
            list.filter((b) => b.gender === 'male').length,
            list.filter((b) => (b.age ?? 99) < 18).length,
            list.filter((b) => ['active', 'enrolled'].includes(b.status)).length,
          ]),
        }
      },
    },
  ]

  const exportReport = async (report: ReportDefinition, format: 'pdf' | 'docx' | 'xlsx' | 'csv'): Promise<void> => {
    if (!organization) return
    const { columns, rows } = report.build()
    if (!rows.length) {
      toast.error('There is no data for this report yet.')
      return
    }
    const blocks: DocumentBlock[] = [{ kind: 'table', columns, rows }]
    const meta = {
      title: report.title,
      documentNumber: `${report.key.toUpperCase()}-${new Date().getFullYear()}`,
      verificationCode: makeVerificationCode(),
      preparedBy: session?.fullName,
      subtitle: `${rows.length} record(s) · ${organization.name}`,
    }
    try {
      if (format === 'pdf') await downloadPdf(organization, meta, blocks)
      if (format === 'docx') await downloadDocx(organization, meta, blocks)
      if (format === 'xlsx') await downloadXlsx(report.key, [{ name: report.title.slice(0, 28), columns, rows }])
      if (format === 'csv') downloadCsv(report.key, columns, rows)
      toast.success(`${report.title} exported`)
    } catch {
      toast.error('Export failed. Please try again.')
    }
  }

  const draftNarrative = async (): Promise<void> => {
    setDrafting(true)
    setNarrativeOpen(true)
    setNarrative('')
    const context = [
      `Organization: ${organization?.name}.`,
      `Projects: ${projects.length}, of which ${projects.filter((p) => p.status === 'active').length} active. Budget ${formatCurrency(sum(projects, (p) => p.budget_minor), currency)}, spent ${formatCurrency(sum(projects, (p) => p.spent_minor), currency)}.`,
      `Beneficiaries reached ${formatNumber(sum(projects, (p) => p.reached_beneficiaries))} of ${formatNumber(sum(projects, (p) => p.target_beneficiaries))} targeted.`,
      `Grants: ${grants.length}, awarded value ${formatCurrency(sum(grants, (g) => g.amount_awarded_minor), currency)}.`,
      `Indicators: ${indicators.length} tracked, average achievement ${Math.round(
        indicators.length
          ? (indicators.reduce((total, i) => total + (i.target_value ? Math.min(1, i.actual_value / i.target_value) : 0), 0) /
              indicators.length) * 100
          : 0,
      )}%.`,
      ...projects
        .slice(0, 12)
        .map((p) => `Project ${p.code} ${p.title}: ${p.progress_percent}% complete, reached ${formatNumber(p.reached_beneficiaries)}.`),
    ].join('\n')

    try {
      const text = await aiClient.draft(
        'Write an executive summary of organizational performance for this quarter, suitable for a board paper. Cover programme delivery, funding position, beneficiary reach and any areas requiring attention.',
        'reports',
        context,
      )
      setNarrative(text)
    } finally {
      setDrafting(false)
    }
  }

  return (
    <AppShell aiModule="reports" aiContext={`Reports available: ${reports.map((r) => r.title).join(', ')}.`}>
      <PageHeader
        title="Reports"
        subtitle="Donor-ready reports in PDF, Word, Excel and CSV with verification codes"
        icon={ScrollText}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Reports' }]}
        actions={
          <button type="button" className="nl-btn nl-btn-primary" onClick={() => void draftNarrative()}>
            <Sparkles size={15} /> Draft executive summary
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const { rows } = report.build()
          return (
            <article key={report.key} className="nl-card flex flex-col p-5">
              <h3 className="font-display text-sm font-bold text-ink">{report.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-ink-2">{report.description}</p>
              <p className="mt-3 text-[11px] text-ink-3">{formatNumber(rows.length)} records</p>
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {(['pdf', 'docx', 'xlsx', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    className="nl-btn nl-btn-subtle h-9 min-h-0 px-1 text-[11px] uppercase"
                    onClick={() => void exportReport(report, format)}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      <NegoModal
        title="Executive summary"
        description="Drafted by the Intelligence Engine from your live organizational data."
        isOpen={narrativeOpen}
        onClose={() => setNarrativeOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className="nl-btn nl-btn-subtle" onClick={() => setNarrativeOpen(false)}>
              Close
            </button>
            <button
              type="button"
              className="nl-btn nl-btn-primary"
              disabled={!narrative || !organization}
              onClick={() => {
                if (!organization) return
                void downloadPdf(
                  organization,
                  {
                    title: 'Executive Summary',
                    documentNumber: `EXEC-SUMMARY-${new Date().getFullYear()}`,
                    verificationCode: makeVerificationCode(),
                    preparedBy: session?.fullName,
                  },
                  [{ kind: 'text', body: narrative }],
                )
              }}
            >
              <Download size={15} /> Download PDF
            </button>
          </>
        }
      >
        {drafting ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
            <Loader2 size={16} className="animate-spin" /> Analysing organizational data…
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{narrative}</p>
        )}
      </NegoModal>
    </AppShell>
  )
}
