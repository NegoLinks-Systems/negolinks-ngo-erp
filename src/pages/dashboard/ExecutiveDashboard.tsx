import { useMemo, type FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  MapPinned,
  Target,
  TrendingUp,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { AppShell } from '@/components/negolinks/AppShell'
import { AIInsightsPanel } from '@/components/negolinks/AIPanel'
import {
  Badge,
  ChartCard,
  KPICard,
  KPICardGrid,
  PageHeader,
  ProgressBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { ComparisonBars, DonutChart, PipelineFunnel, TrendChart } from '@/components/charts'
import { useCollection } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { useAppStore } from '@/stores/app.store'
import { GRANT_STAGES, GRANT_STAGE_LABELS, ROLE_LABELS } from '@/constants'
import {
  daysBetween,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  groupBy,
  sum,
  titleCase,
  toMajor,
} from '@/lib/utils'
import type {
  Beneficiary,
  CalendarEvent,
  ComplianceItem,
  Donation,
  Donor,
  Employee,
  Grant,
  Indicator,
  Program,
  Project,
  PurchaseRequest,
  SmartInsight,
  Transaction,
  Volunteer,
} from '@/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const ExecutiveDashboard: FC = () => {
  const session = useAppStore((state) => state.session)
  const organization = useAppStore((state) => state.organization)
  const setAiPanel = useAppStore((state) => state.setAiPanel)
  const currency = organization?.base_currency ?? 'NGN'

  const { data: projects = [], isLoading: projectsLoading } = useCollection<Project>(TABLES.projects)
  const { data: programs = [] } = useCollection<Program>(TABLES.programs)
  const { data: grants = [] } = useCollection<Grant>(TABLES.grants)
  const { data: donors = [] } = useCollection<Donor>(TABLES.donors)
  const { data: donations = [] } = useCollection<Donation>(TABLES.donations)
  const { data: beneficiaries = [] } = useCollection<Beneficiary>(TABLES.beneficiaries)
  const { data: employees = [] } = useCollection<Employee>(TABLES.employees)
  const { data: volunteers = [] } = useCollection<Volunteer>(TABLES.volunteers)
  const { data: transactions = [] } = useCollection<Transaction>(TABLES.transactions)
  const { data: indicators = [] } = useCollection<Indicator>(TABLES.indicators)
  const { data: compliance = [] } = useCollection<ComplianceItem>(TABLES.compliance)
  const { data: requests = [] } = useCollection<PurchaseRequest>(TABLES.purchaseRequests)
  const { data: events = [] } = useCollection<CalendarEvent>(TABLES.calendar)

  const metrics = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'active')
    const completedProjects = projects.filter((p) => ['completed', 'closed'].includes(p.status))
    const totalBudget = sum(projects, (p) => p.budget_minor)
    const totalSpent = sum(projects, (p) => p.spent_minor)

    const awardedGrants = grants.filter((g) => ['awarded', 'active', 'reporting'].includes(g.stage))
    const fundsReceived =
      sum(awardedGrants, (g) => g.amount_disbursed_minor) +
      sum(donations.filter((d) => d.status === 'received'), (d) => d.amount_minor)
    const fundsUtilized = sum(
      transactions.filter((t) => t.txn_type === 'expense' && t.status === 'posted'),
      (t) => t.base_amount_minor || t.amount_minor,
    )
    const pipelineValue = sum(
      grants.filter((g) => !['awarded', 'active', 'reporting', 'closed'].includes(g.stage)),
      (g) => g.amount_requested_minor,
    )

    const expiringGrants = grants.filter((g) => {
      if (!g.end_date || !['active', 'reporting'].includes(g.stage)) return false
      const days = daysBetween(new Date(), g.end_date)
      return days >= 0 && days <= 90
    })

    const overdueReports = grants.filter(
      (g) => g.next_report_due && daysBetween(new Date(), g.next_report_due) < 0,
    )

    const reached = sum(projects, (p) => p.reached_beneficiaries)
    const targeted = sum(projects, (p) => p.target_beneficiaries)
    const activeBeneficiaries = beneficiaries.filter((b) => ['active', 'enrolled'].includes(b.status))

    const completionRate = projects.length
      ? Math.round(sum(projects, (p) => p.progress_percent) / projects.length)
      : 0
    const budgetUtilization = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0

    const expiringCompliance = compliance.filter((c) => ['due_soon', 'expired'].includes(c.status))
    const pendingApprovals = requests.filter((r) => r.status === 'pending_approval')

    const onTrackIndicators = indicators.filter(
      (i) => i.target_value > 0 && i.actual_value / i.target_value >= 0.8,
    )

    return {
      activeProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      fundsReceived,
      fundsUtilized,
      available: Math.max(0, fundsReceived - fundsUtilized),
      pipelineValue,
      awardedValue: sum(awardedGrants, (g) => g.amount_awarded_minor),
      expiringGrants,
      overdueReports,
      reached,
      targeted,
      activeBeneficiaries,
      completionRate,
      budgetUtilization,
      expiringCompliance,
      pendingApprovals,
      onTrackIndicators,
      donorFunding: sum(donors, (d) => d.total_received_minor),
    }
  }, [projects, grants, donations, transactions, beneficiaries, compliance, requests, indicators, donors])

  /* --------------------------------------------------------- chart data */

  const fundingTrend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
      return { key: `${date.getFullYear()}-${date.getMonth()}`, name: MONTH_LABELS[date.getMonth()] as string }
    })
    const income = new Map<string, number>()
    const expense = new Map<string, number>()
    transactions.forEach((txn) => {
      const date = new Date(txn.txn_date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const amount = toMajor(txn.base_amount_minor || txn.amount_minor)
      const target = txn.txn_type === 'income' ? income : expense
      target.set(key, (target.get(key) ?? 0) + amount)
    })
    return months.map((month) => ({
      name: month.name,
      income: Math.round(income.get(month.key) ?? 0),
      expenditure: Math.round(expense.get(month.key) ?? 0),
    }))
  }, [transactions])

  const programPerformance = useMemo(
    () =>
      programs.slice(0, 8).map((program) => {
        const related = projects.filter((project) => project.program_id === program.id)
        const progress = related.length
          ? Math.round(sum(related, (p) => p.progress_percent) / related.length)
          : 0
        return {
          name: program.name.length > 22 ? `${program.name.slice(0, 20)}…` : program.name,
          progress,
          budget: Math.round(toMajor(sum(related, (p) => p.budget_minor)) / 1000),
        }
      }),
    [programs, projects],
  )

  const donorContribution = useMemo(
    () =>
      [...donors]
        .sort((a, b) => b.total_received_minor - a.total_received_minor)
        .slice(0, 6)
        .map((donor) => ({
          name: donor.name.length > 24 ? `${donor.name.slice(0, 22)}…` : donor.name,
          value: Math.round(toMajor(donor.total_received_minor)),
        })),
    [donors],
  )

  const grantPipeline = useMemo(
    () =>
      GRANT_STAGES.filter((stage) => stage !== 'closed').map((stage) => ({
        name: GRANT_STAGE_LABELS[stage] ?? stage,
        value: grants.filter((grant) => grant.stage === stage).length,
      })).filter((row) => row.value > 0),
    [grants],
  )

  const geographic = useMemo(() => {
    const grouped = groupBy(projects.filter((p) => p.state), (p) => p.state as string)
    return Object.entries(grouped)
      .map(([state, list]) => ({ name: state, projects: list.length, beneficiaries: sum(list, (p) => p.reached_beneficiaries) }))
      .sort((a, b) => b.beneficiaries - a.beneficiaries)
      .slice(0, 8)
  }, [projects])

  const demographics = useMemo(() => {
    const female = beneficiaries.filter((b) => b.gender === 'female').length
    const male = beneficiaries.filter((b) => b.gender === 'male').length
    const other = beneficiaries.length - female - male
    return [
      { name: 'Female', value: female },
      { name: 'Male', value: male },
      ...(other > 0 ? [{ name: 'Other', value: other }] : []),
    ]
  }, [beneficiaries])

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((event) => daysBetween(new Date(), event.start_at) >= -1)
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .slice(0, 6),
    [events],
  )

  const attentionProjects = useMemo(
    () =>
      projects
        .filter((project) => project.status === 'active')
        .map((project) => {
          const elapsed =
            project.start_date && project.end_date
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    (daysBetween(project.start_date, new Date()) /
                      Math.max(1, daysBetween(project.start_date, project.end_date))) *
                      100,
                  ),
                )
              : 0
          return { project, gap: elapsed - project.progress_percent }
        })
        .filter((row) => row.gap > 12)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 5),
    [projects],
  )

  /* ------------------------------------------------------------ AI text */

  const aiContext = useMemo(
    () =>
      [
        `Organization: ${organization?.name ?? 'Not set'} (${organization?.org_type ?? 'NGO'}), base currency ${currency}.`,
        `Projects: ${projects.length} total, ${metrics.activeProjects.length} active, ${metrics.completedProjects.length} completed. Average completion ${metrics.completionRate}%.`,
        `Total project budget ${formatCurrency(metrics.totalBudget, currency)}; spent ${formatCurrency(metrics.totalSpent, currency)} (${metrics.budgetUtilization}% utilized).`,
        `Funds received ${formatCurrency(metrics.fundsReceived, currency)}; utilized ${formatCurrency(metrics.fundsUtilized, currency)}; available ${formatCurrency(metrics.available, currency)}.`,
        `Grants: ${grants.length} total. Awarded value ${formatCurrency(metrics.awardedValue, currency)}. Pipeline value ${formatCurrency(metrics.pipelineValue, currency)}. ${metrics.expiringGrants.length} expiring within 90 days. ${metrics.overdueReports.length} donor reports overdue.`,
        `Donors: ${donors.length}, total received ${formatCurrency(metrics.donorFunding, currency)}.`,
        `Beneficiaries: ${formatNumber(beneficiaries.length)} registered, ${formatNumber(metrics.activeBeneficiaries.length)} active. Reached ${formatNumber(metrics.reached)} of ${formatNumber(metrics.targeted)} targeted.`,
        `People: ${employees.length} staff, ${volunteers.filter((v) => v.status === 'active').length} active volunteers.`,
        `Indicators: ${indicators.length} tracked, ${metrics.onTrackIndicators.length} at or above 80% of target.`,
        `Compliance: ${metrics.expiringCompliance.length} items expired or due soon. Pending approvals: ${metrics.pendingApprovals.length}.`,
        ...attentionProjects.map(
          (row) =>
            `Underperforming project: ${row.project.title} (${row.project.code}) is ${Math.round(row.gap)} percentage points behind schedule at ${row.project.progress_percent}% delivered.`,
        ),
        ...metrics.expiringGrants
          .slice(0, 6)
          .map(
            (grant) =>
              `Grant expiring: ${grant.code} — ${grant.title} ends ${formatDate(grant.end_date)} (${daysBetween(new Date(), grant.end_date as string)} days).`,
          ),
        ...donorContribution
          .slice(0, 3)
          .map((donor) => `Top donor: ${donor.name} contributed approximately ${formatCurrency(donor.value * 100, currency)}.`),
      ].join('\n'),
    [
      organization,
      currency,
      projects.length,
      grants.length,
      donors.length,
      beneficiaries.length,
      employees.length,
      volunteers,
      indicators.length,
      metrics,
      attentionProjects,
      donorContribution,
    ],
  )

  const fallbackInsights = useMemo<SmartInsight[]>(() => {
    const list: SmartInsight[] = []
    if (metrics.expiringGrants.length) {
      list.push({
        id: 'grants-expiring',
        category: 'Alert',
        title: `${metrics.expiringGrants.length} grant(s) expiring within 90 days`,
        detail: `Combined awarded value of ${formatCurrency(sum(metrics.expiringGrants, (g) => g.amount_awarded_minor), currency)}. Begin no-cost extension or renewal conversations now to protect programme continuity.`,
      })
    }
    if (metrics.overdueReports.length) {
      list.push({
        id: 'reports-overdue',
        category: 'Risk',
        title: `${metrics.overdueReports.length} donor report(s) overdue`,
        detail: 'Late reporting is the most common cause of delayed disbursement. Assign owners and submit before the next tranche request.',
      })
    }
    if (attentionProjects.length) {
      const worst = attentionProjects[0]
      list.push({
        id: 'projects-behind',
        category: 'Risk',
        title: `${attentionProjects.length} project(s) behind schedule`,
        detail: `${worst?.project.title} is furthest behind at ${worst?.project.progress_percent}% delivered against elapsed time. Review the implementation plan and constraints.`,
      })
    }
    if (metrics.budgetUtilization > 0) {
      list.push({
        id: 'burn-rate',
        category: 'Forecast',
        title: `Budget utilization at ${metrics.budgetUtilization}%`,
        detail: `${formatCurrency(metrics.totalSpent, currency)} spent of ${formatCurrency(metrics.totalBudget, currency)} committed across the portfolio. Available unspent funding is ${formatCurrency(metrics.available, currency)}.`,
      })
    }
    if (metrics.reached > 0) {
      list.push({
        id: 'impact',
        category: 'Impact',
        title: `${formatNumber(metrics.reached)} beneficiaries reached`,
        detail: `That is ${formatPercent(metrics.targeted ? (metrics.reached / metrics.targeted) * 100 : 0)} of the ${formatNumber(metrics.targeted)} targeted across all projects, with ${metrics.onTrackIndicators.length} of ${indicators.length} indicators at or above 80% of target.`,
      })
    }
    if (!list.length) {
      list.push({
        id: 'empty',
        category: 'Opportunity',
        title: 'Your workspace is ready',
        detail: 'Create your first programme and project, or load a demo scenario from Settings › Demo Data to explore every module with realistic data.',
      })
    }
    return list
  }, [metrics, attentionProjects, currency, indicators.length])

  const money = (minor: number): string => formatCompactCurrency(minor, currency)

  return (
    <AppShell aiModule="dashboard" aiContext={aiContext}>
      <PageHeader
        title={`Welcome, ${session?.fullName?.split(' ')[0] ?? 'there'}`}
        subtitle={`${session ? ROLE_LABELS[session.role] : ''} · ${organization?.name ?? 'Your organization'}`}
        actions={
          <>
            <Link to="/app/reports" className="nl-btn nl-btn-subtle">
              Reports
            </Link>
            <button type="button" className="nl-btn nl-btn-primary" onClick={() => setAiPanel(true)}>
              Ask AI Assistance
            </button>
          </>
        }
      />

      {/* Primary KPIs */}
      <KPICardGrid className="mb-4">
        <KPICard
          title="Total Projects"
          value={formatNumber(projects.length)}
          icon={FolderKanban}
          hint={`${metrics.activeProjects.length} active · ${metrics.completedProjects.length} completed`}
          loading={projectsLoading}
        />
        <KPICard
          title="Project Budget"
          value={money(metrics.totalBudget)}
          icon={Wallet}
          hint={`${metrics.budgetUtilization}% utilized`}
          loading={projectsLoading}
        />
        <KPICard
          title="Beneficiaries Reached"
          value={formatNumber(metrics.reached)}
          icon={UsersRound}
          hint={`of ${formatNumber(metrics.targeted)} targeted`}
          loading={projectsLoading}
        />
        <KPICard
          title="Available Funding"
          value={money(metrics.available)}
          icon={TrendingUp}
          hint={`Received ${money(metrics.fundsReceived)}`}
          loading={projectsLoading}
        />
      </KPICardGrid>

      <KPICardGrid className="mb-4">
        <KPICard title="Grant Pipeline" value={money(metrics.pipelineValue)} icon={HandCoins} hint={`${grants.length} grants tracked`} />
        <KPICard title="Grants Awarded" value={money(metrics.awardedValue)} icon={BadgeCheck} hint={`${metrics.expiringGrants.length} expiring in 90 days`} />
        <KPICard title="Donor Funding" value={money(metrics.donorFunding)} icon={HeartHandshake} hint={`${donors.length} donors on record`} />
        <KPICard title="Funds Utilized" value={money(metrics.fundsUtilized)} icon={Activity} hint="Posted expenditure to date" />
      </KPICardGrid>

      <KPICardGrid className="mb-6">
        <KPICard title="Completion Rate" value={`${metrics.completionRate}%`} icon={Target} hint="Average across all projects" />
        <KPICard title="Staff & Volunteers" value={`${employees.length} / ${volunteers.filter((v) => v.status === 'active').length}`} icon={UsersRound} hint="Staff / active volunteers" />
        <KPICard title="Pending Approvals" value={formatNumber(metrics.pendingApprovals.length)} icon={ClipboardCheck} hint="Awaiting your action" />
        <KPICard
          title="Compliance Status"
          value={metrics.expiringCompliance.length ? `${metrics.expiringCompliance.length} due` : 'Healthy'}
          icon={metrics.expiringCompliance.length ? AlertTriangle : BadgeCheck}
          hint={metrics.expiringCompliance.length ? 'Items expired or due soon' : 'All statutory items valid'}
        />
      </KPICardGrid>

      {/* Charts row 1 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Income and expenditure" subtitle="Last 12 months" className="lg:col-span-2">
          <TrendChart
            data={fundingTrend}
            series={[
              { key: 'income', label: 'Income', color: '#22C55E' },
              { key: 'expenditure', label: 'Expenditure', color: '#7C3AED' },
            ]}
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>

        <AIInsightsPanel
          module="dashboard"
          context={aiContext}
          fallback={fallbackInsights}
          onOpenAssistant={() => setAiPanel(true)}
        />
      </div>

      {/* Charts row 2 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Grant pipeline" subtitle="Opportunities through to reporting">
          {grantPipeline.length ? (
            <PipelineFunnel data={grantPipeline} />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No grants recorded yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Donor contribution" subtitle="Top contributors by funds received">
          {donorContribution.length ? (
            <ComparisonBars
              data={donorContribution.map((row) => ({ name: row.name, value: row.value }))}
              series={[{ key: 'value', label: 'Received' }]}
              layout="vertical"
              formatter={(value) => formatCompactCurrency(value * 100, currency)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No donor contributions recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Programme performance" subtitle="Average delivery progress">
          {programPerformance.length ? (
            <ComparisonBars
              data={programPerformance.map((row) => ({ name: row.name, progress: row.progress }))}
              series={[{ key: 'progress', label: 'Progress %' }]}
              layout="vertical"
              formatter={(value) => `${value}%`}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No programmes recorded yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Beneficiary demographics" subtitle="Registered by gender">
          {beneficiaries.length ? (
            <DonutChart data={demographics} formatter={(value) => formatNumber(value)} />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No beneficiaries registered yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Geographic coverage" subtitle="Reach by location">
          {geographic.length ? (
            <ComparisonBars
              data={geographic.map((row) => ({ name: row.name, beneficiaries: row.beneficiaries }))}
              series={[{ key: 'beneficiaries', label: 'Reached' }]}
              layout="vertical"
              formatter={(value) => formatNumber(value)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No geographic data yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Operational panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="nl-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-ink">
            <AlertTriangle size={15} style={{ color: '#F59E0B' }} /> Projects needing attention
          </h3>
          {attentionProjects.length ? (
            <ul className="space-y-3.5">
              {attentionProjects.map(({ project, gap }) => (
                <li key={project.id}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Link to="/app/projects" className="truncate text-xs font-semibold text-ink hover:text-accent-light">
                      {project.title}
                    </Link>
                    <Badge tone="warning">{Math.round(gap)}pp behind</Badge>
                  </div>
                  <ProgressBar value={project.progress_percent} showLabel />
                  <p className="mt-1 text-[11px] text-ink-3">
                    {project.code} · {project.location ?? project.state}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-xs text-ink-3">
              All active projects are tracking against schedule.
            </p>
          )}
        </section>

        <section className="nl-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-ink">
            <CalendarClock size={15} style={{ color: 'var(--accent-primary)' }} /> Upcoming deadlines
          </h3>
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((event) => {
                const days = daysBetween(new Date(), event.start_at)
                return (
                  <li key={event.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold leading-none"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent-light)' }}
                    >
                      {new Date(event.start_at).getDate()}
                      <span className="mt-0.5 text-[8px] font-medium uppercase">
                        {MONTH_LABELS[new Date(event.start_at).getMonth()]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">{event.title}</span>
                      <span className="block text-[11px] text-ink-3">
                        {titleCase(event.event_type)} ·{' '}
                        {days === 0 ? 'Today' : days > 0 ? `in ${days} day${days === 1 ? '' : 's'}` : `${Math.abs(days)} days ago`}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-xs text-ink-3">No upcoming deadlines recorded.</p>
          )}
        </section>

        <section className="nl-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-ink">
            <MapPinned size={15} style={{ color: 'var(--accent-primary)' }} /> Portfolio snapshot
          </h3>
          <dl className="space-y-3">
            {[
              ['Programmes', formatNumber(programs.length)],
              ['Active projects', formatNumber(metrics.activeProjects.length)],
              ['Locations covered', formatNumber(geographic.length)],
              ['Indicators tracked', formatNumber(indicators.length)],
              ['Indicators on track', `${metrics.onTrackIndicators.length} / ${indicators.length}`],
              ['Registered beneficiaries', formatNumber(beneficiaries.length)],
              ['Partners engaged', formatNumber(donors.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                <dt className="text-xs text-ink-3">{label}</dt>
                <dd className="text-sm font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {metrics.expiringCompliance.length ? (
            <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.10)' }}>
              <p className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>
                Compliance attention
              </p>
              <ul className="mt-1.5 space-y-1">
                {metrics.expiringCompliance.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-[11px] text-ink-2">
                    <span className="truncate">{item.title}</span>
                    <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  )
}

export default ExecutiveDashboard
