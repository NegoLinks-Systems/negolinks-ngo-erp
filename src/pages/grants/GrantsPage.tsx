import { useMemo, useState, type FC } from 'react'
import { AlertTriangle, CalendarClock, HandCoins, Layers, Plus, Wallet } from 'lucide-react'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import {
  Badge,
  ChartCard,
  KPICard,
  KPICardGrid,
  PageHeader,
  ProgressBar,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { RecordForm, type FormValues } from '@/components/negolinks/RecordForm'
import { PipelineFunnel, ComparisonBars } from '@/components/charts'
import { useCollection, useCreateRecord, useUpdateRecord } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { GRANT_STAGES, GRANT_STAGE_LABELS } from '@/constants'
import { useAppStore } from '@/stores/app.store'
import {
  daysBetween,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  sum,
  titleCase,
  toMajor,
  toMinor,
} from '@/lib/utils'
import type { Donor, Grant, GrantDisbursement, GrantReport } from '@/types'

const stageOptions = GRANT_STAGES.map((stage) => ({ value: stage, label: GRANT_STAGE_LABELS[stage] ?? stage }))

export const GrantsPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const can = useAppStore((state) => state.can)
  const { data: grants = [], isLoading } = useCollection<Grant>(TABLES.grants)
  const { data: donors = [] } = useCollection<Donor>(TABLES.donors)
  const { data: disbursements = [] } = useCollection<GrantDisbursement>(TABLES.grantDisbursements)
  const { data: reports = [] } = useCollection<GrantReport>(TABLES.grantReports)
  const create = useCreateRecord<Record<string, unknown>>(TABLES.grants, 'Grant')
  const update = useUpdateRecord<Record<string, unknown>>(TABLES.grants, 'Grant')

  const [tab, setTab] = useState('pipeline')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Grant | null>(null)

  const donorName = (id: string | null): string => donors.find((donor) => donor.id === id)?.name ?? '—'

  const metrics = useMemo(() => {
    const awarded = grants.filter((g) => ['awarded', 'active', 'reporting'].includes(g.stage))
    const pipeline = grants.filter((g) => !['awarded', 'active', 'reporting', 'closed'].includes(g.stage))
    const expiring = grants.filter((g) => {
      if (!g.end_date || !['active', 'reporting'].includes(g.stage)) return false
      const days = daysBetween(new Date(), g.end_date)
      return days >= 0 && days <= 90
    })
    const overdueReports = reports.filter((r) => r.status === 'overdue' || (!r.submitted_date && daysBetween(new Date(), r.due_date) < 0))
    const weighted = sum(pipeline, (g) => (g.amount_requested_minor * g.probability_percent) / 100)
    return {
      awarded,
      pipeline,
      expiring,
      overdueReports,
      weighted,
      awardedValue: sum(awarded, (g) => g.amount_awarded_minor),
      disbursedValue: sum(awarded, (g) => g.amount_disbursed_minor),
      utilizedValue: sum(awarded, (g) => g.amount_utilized_minor),
      pipelineValue: sum(pipeline, (g) => g.amount_requested_minor),
    }
  }, [grants, reports])

  const funnel = useMemo(
    () =>
      GRANT_STAGES.filter((stage) => stage !== 'closed')
        .map((stage) => ({
          name: GRANT_STAGE_LABELS[stage] ?? stage,
          value: grants.filter((grant) => grant.stage === stage).length,
        }))
        .filter((row) => row.value > 0),
    [grants],
  )

  const aiContext = useMemo(
    () =>
      [
        `Grants: ${grants.length} total. Awarded value ${formatCurrency(metrics.awardedValue, currency)}, disbursed ${formatCurrency(metrics.disbursedValue, currency)}, utilized ${formatCurrency(metrics.utilizedValue, currency)}.`,
        `Pipeline: ${metrics.pipeline.length} opportunities worth ${formatCurrency(metrics.pipelineValue, currency)} (probability-weighted ${formatCurrency(metrics.weighted, currency)}).`,
        `${metrics.expiring.length} grants expire within 90 days. ${metrics.overdueReports.length} donor reports overdue.`,
        ...grants.map(
          (grant) =>
            `${grant.code} — ${grant.title}. Donor ${donorName(grant.donor_id)}. Stage ${grant.stage}. Requested ${formatCurrency(grant.amount_requested_minor, grant.currency)}, awarded ${formatCurrency(grant.amount_awarded_minor, grant.currency)}, disbursed ${formatCurrency(grant.amount_disbursed_minor, grant.currency)}. Ends ${formatDate(grant.end_date)}. Next report due ${formatDate(grant.next_report_due)}. Compliance ${grant.compliance_status}.`,
        ),
      ].join('\n'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grants, metrics, currency, donors],
  )

  const handleSubmit = (values: FormValues): void => {
    const payload: Record<string, unknown> = { ...values }
    ;['amount_requested_minor', 'amount_awarded_minor', 'amount_disbursed_minor', 'amount_utilized_minor'].forEach(
      (field) => {
        const value = payload[field]
        payload[field] = typeof value === 'number' ? toMinor(value) : 0
      },
    )
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null
    })
    if (editing) {
      update.mutate({ id: editing.id, changes: payload }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  const grantFields = [
    { name: 'title', label: 'Grant title', type: 'text' as const, required: true, full: true },
    { name: 'code', label: 'Grant code', type: 'text' as const, required: true },
    {
      name: 'donor_id',
      label: 'Donor',
      type: 'select' as const,
      options: donors.map((donor) => ({ value: donor.id, label: donor.name })),
    },
    { name: 'stage', label: 'Pipeline stage', type: 'select' as const, required: true, defaultValue: 'opportunity', options: stageOptions },
    { name: 'focus_area', label: 'Focus area', type: 'text' as const },
    { name: 'amount_requested_minor', label: 'Amount requested', type: 'money' as const },
    { name: 'amount_awarded_minor', label: 'Amount awarded', type: 'money' as const },
    { name: 'amount_disbursed_minor', label: 'Amount disbursed', type: 'money' as const },
    { name: 'amount_utilized_minor', label: 'Amount utilized', type: 'money' as const },
    { name: 'currency', label: 'Currency', type: 'text' as const, defaultValue: 'NGN' },
    { name: 'probability_percent', label: 'Win probability (%)', type: 'number' as const, min: 0, max: 100 },
    { name: 'application_deadline', label: 'Application deadline', type: 'date' as const },
    { name: 'submitted_on', label: 'Submitted on', type: 'date' as const },
    { name: 'award_date', label: 'Award date', type: 'date' as const },
    { name: 'start_date', label: 'Start date', type: 'date' as const },
    { name: 'end_date', label: 'End date', type: 'date' as const },
    { name: 'next_report_due', label: 'Next report due', type: 'date' as const },
    {
      name: 'reporting_frequency',
      label: 'Reporting frequency',
      type: 'select' as const,
      defaultValue: 'quarterly',
      options: ['monthly', 'quarterly', 'biannual', 'annual', 'final_only'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    {
      name: 'compliance_status',
      label: 'Compliance status',
      type: 'select' as const,
      defaultValue: 'compliant',
      options: ['compliant', 'at_risk', 'breach'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: 'requirements', label: 'Donor requirements', type: 'textarea' as const, full: true },
  ]

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!editing) return undefined
    return {
      title: editing.title,
      code: editing.code,
      donor_id: editing.donor_id ?? '',
      stage: editing.stage,
      focus_area: editing.focus_area ?? '',
      amount_requested_minor: toMajor(editing.amount_requested_minor),
      amount_awarded_minor: toMajor(editing.amount_awarded_minor),
      amount_disbursed_minor: toMajor(editing.amount_disbursed_minor),
      amount_utilized_minor: toMajor(editing.amount_utilized_minor),
      currency: editing.currency,
      probability_percent: editing.probability_percent,
      application_deadline: editing.application_deadline ?? '',
      submitted_on: editing.submitted_on ?? '',
      award_date: editing.award_date ?? '',
      start_date: editing.start_date ?? '',
      end_date: editing.end_date ?? '',
      next_report_due: editing.next_report_due ?? '',
      reporting_frequency: editing.reporting_frequency,
      compliance_status: editing.compliance_status,
      requirements: editing.requirements ?? '',
    }
  }, [editing])

  return (
    <AppShell aiModule="grants" aiContext={aiContext}>
      <PageHeader
        title="Grants"
        subtitle="Opportunity to closeout, with disbursements, reporting calendar and compliance"
        icon={HandCoins}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Grants' }]}
        actions={
          can('create') ? (
            <button
              type="button"
              className="nl-btn nl-btn-primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus size={15} /> New Grant
            </button>
          ) : null
        }
      />

      <KPICardGrid className="mb-5">
        <KPICard
          title="Awarded value"
          value={formatCompactCurrency(metrics.awardedValue, currency)}
          icon={Wallet}
          hint={`${metrics.awarded.length} active awards`}
          loading={isLoading}
        />
        <KPICard
          title="Pipeline value"
          value={formatCompactCurrency(metrics.pipelineValue, currency)}
          icon={Layers}
          hint={`Weighted ${formatCompactCurrency(metrics.weighted, currency)}`}
          loading={isLoading}
        />
        <KPICard
          title="Expiring in 90 days"
          value={formatNumber(metrics.expiring.length)}
          icon={CalendarClock}
          hint={metrics.expiring.length ? 'Plan extensions or renewals' : 'No imminent expiries'}
          loading={isLoading}
        />
        <KPICard
          title="Overdue reports"
          value={formatNumber(metrics.overdueReports.length)}
          icon={AlertTriangle}
          hint={metrics.overdueReports.length ? 'Late reporting delays disbursement' : 'All reporting current'}
          loading={isLoading}
        />
      </KPICardGrid>

      {metrics.expiring.length ? (
        <div
          className="mb-5 rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: '#F59E0B' }}>
            <AlertTriangle size={15} /> Grants expiring within 90 days
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {metrics.expiring.map((grant) => (
              <li key={grant.id} className="flex items-center justify-between gap-3 text-xs text-ink-2">
                <span className="truncate">
                  <strong className="text-ink">{grant.code}</strong> — {grant.title}
                </span>
                <Badge tone="warning">{daysBetween(new Date(), grant.end_date as string)}d</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Grant pipeline" subtitle="Opportunities by stage">
          {funnel.length ? <PipelineFunnel data={funnel} /> : <p className="py-12 text-center text-xs text-ink-3">No grants yet.</p>}
        </ChartCard>
        <ChartCard title="Award versus disbursement" subtitle="Top awards by value">
          <ComparisonBars
            data={[...metrics.awarded]
              .sort((a, b) => b.amount_awarded_minor - a.amount_awarded_minor)
              .slice(0, 7)
              .map((grant) => ({
                name: grant.code,
                awarded: Math.round(toMajor(grant.amount_awarded_minor)),
                disbursed: Math.round(toMajor(grant.amount_disbursed_minor)),
              }))}
            series={[
              { key: 'awarded', label: 'Awarded' },
              { key: 'disbursed', label: 'Disbursed', color: '#22C55E' },
            ]}
            layout="vertical"
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
      </div>

      <TabBar
        tabs={[
          { key: 'pipeline', label: 'All grants', count: grants.length },
          { key: 'disbursements', label: 'Disbursements', count: disbursements.length },
          { key: 'reports', label: 'Donor reports', count: reports.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'pipeline' ? (
        <DataTable<Grant>
          data={grants}
          loading={isLoading}
          exportName="grants"
          exportTitle="Grant Register"
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
            { key: 'title', header: 'Title' },
            { key: 'donor', header: 'Donor', value: (row) => donorName(row.donor_id), render: (row) => donorName(row.donor_id) },
            {
              key: 'stage',
              header: 'Stage',
              render: (row) => <Badge tone={statusTone(row.stage)}>{GRANT_STAGE_LABELS[row.stage] ?? row.stage}</Badge>,
            },
            {
              key: 'amount_awarded_minor',
              header: 'Awarded',
              align: 'right',
              value: (row) => row.amount_awarded_minor,
              render: (row) =>
                row.amount_awarded_minor
                  ? formatCurrency(row.amount_awarded_minor, row.currency)
                  : formatCurrency(row.amount_requested_minor, row.currency),
            },
            {
              key: 'utilization',
              header: 'Utilization',
              value: (row) => (row.amount_disbursed_minor ? row.amount_utilized_minor / row.amount_disbursed_minor : 0),
              render: (row) => (
                <ProgressBar
                  value={row.amount_disbursed_minor ? (row.amount_utilized_minor / row.amount_disbursed_minor) * 100 : 0}
                  showLabel
                  className="min-w-[110px]"
                />
              ),
            },
            { key: 'end_date', header: 'Ends', render: (row) => formatDate(row.end_date) },
            {
              key: 'compliance_status',
              header: 'Compliance',
              render: (row) => <Badge tone={statusTone(row.compliance_status)}>{titleCase(row.compliance_status)}</Badge>,
            },
          ]}
          filters={[
            { key: 'stage', label: 'Stage', options: stageOptions, match: (row, value) => row.stage === value },
            {
              key: 'compliance',
              label: 'Compliance',
              options: ['compliant', 'at_risk', 'breach'].map((v) => ({ value: v, label: titleCase(v) })),
              match: (row, value) => row.compliance_status === value,
            },
          ]}
          actions={
            can('edit')
              ? (row) => (
                  <button
                    type="button"
                    className="nl-btn nl-btn-subtle h-8 min-h-0 px-2.5 text-xs"
                    onClick={() => {
                      setEditing(row)
                      setFormOpen(true)
                    }}
                  >
                    Edit
                  </button>
                )
              : undefined
          }
        />
      ) : null}

      {tab === 'disbursements' ? (
        <DataTable<GrantDisbursement>
          data={disbursements}
          exportName="grant-disbursements"
          exportTitle="Grant Disbursements"
          columns={[
            {
              key: 'grant',
              header: 'Grant',
              value: (row) => grants.find((g) => g.id === row.grant_id)?.code ?? '',
              render: (row) => (
                <span className="font-semibold text-ink">{grants.find((g) => g.id === row.grant_id)?.code ?? '—'}</span>
              ),
            },
            { key: 'tranche_no', header: 'Tranche', align: 'center' },
            {
              key: 'amount_minor',
              header: 'Amount',
              align: 'right',
              value: (row) => row.amount_minor,
              render: (row) => formatCurrency(row.amount_minor, row.currency),
            },
            { key: 'due_date', header: 'Due', render: (row) => formatDate(row.due_date) },
            { key: 'received_date', header: 'Received', render: (row) => formatDate(row.received_date) },
            { key: 'reference', header: 'Reference' },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: ['expected', 'received', 'overdue'].map((v) => ({ value: v, label: titleCase(v) })),
              match: (row, value) => row.status === value,
            },
          ]}
        />
      ) : null}

      {tab === 'reports' ? (
        <DataTable<GrantReport>
          data={reports}
          exportName="grant-reports"
          exportTitle="Donor Reporting Calendar"
          columns={[
            { key: 'title', header: 'Report', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            {
              key: 'grant',
              header: 'Grant',
              value: (row) => grants.find((g) => g.id === row.grant_id)?.code ?? '',
              render: (row) => grants.find((g) => g.id === row.grant_id)?.code ?? '—',
            },
            { key: 'period_end', header: 'Period end', render: (row) => formatDate(row.period_end) },
            {
              key: 'due_date',
              header: 'Due',
              render: (row) => {
                const days = daysBetween(new Date(), row.due_date)
                return (
                  <span className={days < 0 && !row.submitted_date ? 'font-semibold text-danger' : undefined}>
                    {formatDate(row.due_date)}
                  </span>
                )
              },
            },
            { key: 'submitted_date', header: 'Submitted', render: (row) => formatDate(row.submitted_date) },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: ['pending', 'draft', 'submitted', 'accepted', 'overdue'].map((v) => ({ value: v, label: titleCase(v) })),
              match: (row, value) => row.status === value,
            },
          ]}
        />
      ) : null}

      <RecordForm
        title={editing ? 'Edit grant' : 'New grant'}
        description="Track the opportunity through every stage of the pipeline."
        fields={grantFields}
        initial={initialValues}
        isOpen={formOpen}
        submitting={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save changes' : 'Create grant'}
      />
    </AppShell>
  )
}

export default GrantsPage
