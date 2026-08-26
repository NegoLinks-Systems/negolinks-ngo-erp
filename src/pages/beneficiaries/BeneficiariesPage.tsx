import { useMemo, useState, type FC } from 'react'
import {
  Eye,
  EyeOff,
  Home,
  LifeBuoy,
  MapPinned,
  Plus,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import {
  Badge,
  ChartCard,
  KPICard,
  KPICardGrid,
  NegoModal,
  PageHeader,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { RecordForm, type FormValues } from '@/components/negolinks/RecordForm'
import { ComparisonBars, DonutChart } from '@/components/charts'
import { useCollection, useCreateRecord, useUpdateRecord } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { VULNERABILITY_CATEGORIES } from '@/constants'
import { useAppStore } from '@/stores/app.store'
import { formatDate, formatNumber, formatPercent, groupBy, titleCase } from '@/lib/utils'
import type { Beneficiary, CaseFile, CaseNote, FieldVisit, Household, Project } from '@/types'

const optionsOf = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

/** Masks direct identifiers for users without elevated permission. */
const maskIdentifier = (value: string | null): string => {
  if (!value) return '—'
  if (value.length <= 4) return '••••'
  return `${value.slice(0, 2)}••••${value.slice(-2)}`
}

export const BeneficiariesPage: FC = () => {
  const can = useAppStore((state) => state.can)
  const hasRole = useAppStore((state) => state.hasRole)
  const { data: beneficiaries = [], isLoading } = useCollection<Beneficiary>(TABLES.beneficiaries)
  const { data: households = [] } = useCollection<Household>(TABLES.households)
  const create = useCreateRecord<Record<string, unknown>>(TABLES.beneficiaries, 'Beneficiary')
  const update = useUpdateRecord<Record<string, unknown>>(TABLES.beneficiaries, 'Beneficiary')

  const [tab, setTab] = useState('beneficiaries')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Beneficiary | null>(null)
  const [anonymizing, setAnonymizing] = useState<Beneficiary | null>(null)
  const [revealIdentifiers, setRevealIdentifiers] = useState(false)

  const canSeeIdentifiers = hasRole('super_admin', 'admin', 'manager')

  const metrics = useMemo(() => {
    const active = beneficiaries.filter((b) => ['active', 'enrolled'].includes(b.status))
    const female = beneficiaries.filter((b) => b.gender === 'female').length
    const children = beneficiaries.filter((b) => (b.age ?? 99) < 18).length
    const withDisability = beneficiaries.filter((b) => b.vulnerability?.includes('Person With Disability')).length
    return { active, female, children, withDisability }
  }, [beneficiaries])

  const vulnerabilityBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    beneficiaries.forEach((beneficiary) => {
      beneficiary.vulnerability?.forEach((category) => counts.set(category, (counts.get(category) ?? 0) + 1))
    })
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [beneficiaries])

  const aiContext = useMemo(
    () =>
      [
        `Beneficiaries: ${beneficiaries.length} registered, ${metrics.active.length} active.`,
        `Gender split: ${metrics.female} female (${formatPercent(beneficiaries.length ? (metrics.female / beneficiaries.length) * 100 : 0)}), ${beneficiaries.length - metrics.female} other.`,
        `${metrics.children} are under 18. ${metrics.withDisability} are recorded as persons with disability.`,
        `Households: ${households.length} registered, average size ${households.length ? (households.reduce((total, h) => total + h.size, 0) / households.length).toFixed(1) : 0}.`,
        ...Object.entries(groupBy(beneficiaries.filter((b) => b.community), (b) => b.community as string))
          .map(([community, list]) => `Community ${community}: ${list.length} beneficiaries.`)
          .slice(0, 25),
        ...vulnerabilityBreakdown.map((row) => `Vulnerability "${row.name}": ${row.value} beneficiaries.`),
      ].join('\n'),
    [beneficiaries, households, metrics, vulnerabilityBreakdown],
  )

  const fields = [
    { name: 'full_name', label: 'Full name', type: 'text' as const, required: true },
    { name: 'code', label: 'Beneficiary code', type: 'text' as const, required: true },
    { name: 'gender', label: 'Gender', type: 'select' as const, required: true, options: optionsOf(['female', 'male', 'other']) },
    { name: 'date_of_birth', label: 'Date of birth', type: 'date' as const },
    { name: 'age', label: 'Age', type: 'number' as const },
    { name: 'phone', label: 'Phone', type: 'tel' as const },
    { name: 'id_type', label: 'Identification type', type: 'text' as const },
    { name: 'id_number', label: 'Identification number', type: 'text' as const, hint: 'Visible only to authorized roles' },
    { name: 'country', label: 'Country', type: 'text' as const, defaultValue: 'Nigeria' },
    { name: 'state', label: 'State / Region', type: 'text' as const },
    { name: 'lga', label: 'LGA / District', type: 'text' as const },
    { name: 'community', label: 'Community', type: 'text' as const },
    {
      name: 'vulnerability',
      label: 'Vulnerability categories',
      type: 'multiselect' as const,
      full: true,
      options: VULNERABILITY_CATEGORIES.map((value) => ({ value, label: value })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      defaultValue: 'registered',
      options: optionsOf(['registered', 'enrolled', 'active', 'graduated', 'exited']),
    },
    { name: 'registered_on', label: 'Registered on', type: 'date' as const },
    { name: 'notes', label: 'Notes', type: 'textarea' as const, full: true },
  ]

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!editing) return undefined
    return {
      full_name: editing.full_name,
      code: editing.code,
      gender: editing.gender,
      date_of_birth: editing.date_of_birth ?? '',
      age: editing.age ?? 0,
      phone: editing.phone ?? '',
      id_type: editing.id_type ?? '',
      id_number: editing.id_number ?? '',
      country: editing.country,
      state: editing.state ?? '',
      lga: editing.lga ?? '',
      community: editing.community ?? '',
      vulnerability: editing.vulnerability ?? [],
      status: editing.status,
      registered_on: editing.registered_on,
      notes: editing.notes ?? '',
    }
  }, [editing])

  const handleSubmit = (values: FormValues): void => {
    const payload: Record<string, unknown> = { ...values }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null
    })
    if (editing) {
      update.mutate({ id: editing.id, changes: payload }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  const anonymize = (): void => {
    if (!anonymizing) return
    update.mutate(
      {
        id: anonymizing.id,
        changes: {
          full_name: `Anonymized Beneficiary ${anonymizing.code}`,
          phone: null,
          id_number: null,
          id_type: null,
          date_of_birth: null,
          notes: null,
          is_anonymized: true,
        },
      },
      {
        onSuccess: () => {
          setAnonymizing(null)
          toast.success('Beneficiary record anonymized — programme statistics are unaffected.')
        },
      },
    )
  }

  return (
    <AppShell aiModule="beneficiaries" aiContext={aiContext}>
      <PageHeader
        title="Beneficiaries"
        subtitle="Registration, households, vulnerability profiling and service history"
        icon={UsersRound}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Beneficiaries' }]}
        actions={
          <>
            {canSeeIdentifiers ? (
              <button
                type="button"
                className="nl-btn nl-btn-subtle"
                onClick={() => setRevealIdentifiers((value) => !value)}
              >
                {revealIdentifiers ? <EyeOff size={15} /> : <Eye size={15} />}
                <span className="hidden sm:inline">{revealIdentifiers ? 'Hide' : 'Reveal'} identifiers</span>
              </button>
            ) : null}
            {can('create') ? (
              <button
                type="button"
                className="nl-btn nl-btn-primary"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus size={15} /> Register
              </button>
            ) : null}
          </>
        }
      />

      <div
        className="mb-5 flex items-start gap-3 rounded-xl p-4"
        style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-border)' }}
      >
        <ShieldCheck size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
        <p className="text-xs leading-relaxed text-ink-2">
          <strong className="text-ink">Beneficiary data is protected.</strong> Direct identifiers are masked by
          default and visible only to authorized roles. Every view and change is written to the audit trail.
          Records can be anonymized on request while preserving programme statistics.
        </p>
      </div>

      <KPICardGrid className="mb-5">
        <KPICard title="Registered" value={formatNumber(beneficiaries.length)} icon={UsersRound} hint={`${metrics.active.length} currently active`} loading={isLoading} />
        <KPICard
          title="Female"
          value={formatPercent(beneficiaries.length ? (metrics.female / beneficiaries.length) * 100 : 0)}
          icon={UserCheck}
          hint={`${formatNumber(metrics.female)} individuals`}
          loading={isLoading}
        />
        <KPICard title="Children (under 18)" value={formatNumber(metrics.children)} icon={LifeBuoy} loading={isLoading} />
        <KPICard title="Households" value={formatNumber(households.length)} icon={Home} hint={`${formatNumber(households.reduce((total, h) => total + h.size, 0))} people covered`} loading={isLoading} />
      </KPICardGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Vulnerability profile" subtitle="Most common categories recorded">
          {vulnerabilityBreakdown.length ? (
            <ComparisonBars
              data={vulnerabilityBreakdown}
              series={[{ key: 'value', label: 'Beneficiaries' }]}
              layout="vertical"
              formatter={(value) => formatNumber(value)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No beneficiaries registered yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Status distribution" subtitle="Where beneficiaries are in the programme journey">
          {beneficiaries.length ? (
            <DonutChart
              data={Object.entries(groupBy(beneficiaries, (row) => titleCase(row.status))).map(([name, list]) => ({
                name,
                value: list.length,
              }))}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No beneficiaries registered yet.</p>
          )}
        </ChartCard>
      </div>

      <TabBar
        tabs={[
          { key: 'beneficiaries', label: 'Individuals', count: beneficiaries.length },
          { key: 'households', label: 'Households', count: households.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'beneficiaries' ? (
        <DataTable<Beneficiary>
          data={beneficiaries}
          loading={isLoading}
          exportName="beneficiaries"
          exportTitle="Beneficiary Register"
          columns={[
            {
              key: 'full_name',
              header: 'Name',
              render: (row) => (
                <span className="font-semibold text-ink">
                  {row.is_anonymized ? <em className="text-ink-3">{row.full_name}</em> : row.full_name}
                </span>
              ),
            },
            { key: 'code', header: 'Code' },
            { key: 'gender', header: 'Gender', render: (row) => titleCase(row.gender) },
            { key: 'age', header: 'Age', align: 'right', render: (row) => (row.age ? String(row.age) : '—') },
            { key: 'community', header: 'Community' },
            { key: 'state', header: 'State' },
            {
              key: 'id_number',
              header: 'ID number',
              sortable: false,
              render: (row) =>
                canSeeIdentifiers && revealIdentifiers ? row.id_number ?? '—' : maskIdentifier(row.id_number),
            },
            {
              key: 'vulnerability',
              header: 'Vulnerability',
              sortable: false,
              hideOnMobile: true,
              render: (row) => (row.vulnerability?.length ? row.vulnerability.slice(0, 2).join(', ') : '—'),
            },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: optionsOf(['registered', 'enrolled', 'active', 'graduated', 'exited']),
              match: (row, value) => row.status === value,
            },
            { key: 'gender', label: 'Gender', options: optionsOf(['female', 'male', 'other']), match: (row, value) => row.gender === value },
            {
              key: 'vulnerability',
              label: 'Vulnerability',
              options: VULNERABILITY_CATEGORIES.map((value) => ({ value, label: value })),
              match: (row, value) => Boolean(row.vulnerability?.includes(value)),
            },
          ]}
          actions={
            can('edit')
              ? (row) => (
                  <>
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
                    {!row.is_anonymized && can('admin') ? (
                      <button
                        type="button"
                        className="nl-btn nl-btn-subtle h-8 min-h-0 px-2.5 text-xs"
                        onClick={() => setAnonymizing(row)}
                        title="Anonymize this record"
                      >
                        <ShieldCheck size={13} />
                      </button>
                    ) : null}
                  </>
                )
              : undefined
          }
        />
      ) : (
        <DataTable<Household>
          data={households}
          exportName="households"
          exportTitle="Household Register"
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
            { key: 'head_name', header: 'Head of household' },
            { key: 'size', header: 'Size', align: 'right' },
            { key: 'female_count', header: 'Female', align: 'right' },
            { key: 'male_count', header: 'Male', align: 'right' },
            { key: 'children_count', header: 'Children', align: 'right' },
            { key: 'community', header: 'Community' },
            { key: 'state', header: 'State' },
            { key: 'income_band', header: 'Income band', hideOnMobile: true },
          ]}
        />
      )}

      <RecordForm
        title={editing ? 'Edit beneficiary' : 'Register beneficiary'}
        description="Personal identifiers are stored securely and masked in listings by default."
        fields={fields}
        initial={initialValues}
        isOpen={formOpen}
        submitting={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save changes' : 'Register'}
      />

      <NegoModal
        title="Anonymize beneficiary record?"
        description="Used when a beneficiary withdraws consent or a retention period expires."
        isOpen={Boolean(anonymizing)}
        onClose={() => setAnonymizing(null)}
        size="sm"
        destructive
        footer={
          <>
            <button type="button" className="nl-btn nl-btn-subtle" onClick={() => setAnonymizing(null)}>
              Cancel
            </button>
            <button type="button" className="nl-btn nl-btn-danger" onClick={anonymize} disabled={update.isPending}>
              Anonymize
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Name, phone number, identification details and notes are permanently replaced. Enrolments, services
          delivered and aggregate statistics are preserved so reporting remains accurate. This cannot be undone.
        </p>
      </NegoModal>
    </AppShell>
  )
}

/* ------------------------------------------------------- Case management */

export const CasesPage: FC = () => {
  const { data: cases = [], isLoading } = useCollection<CaseFile>(TABLES.cases)
  const { data: notes = [] } = useCollection<CaseNote>(TABLES.caseNotes)
  const { data: beneficiaries = [] } = useCollection<Beneficiary>(TABLES.beneficiaries)
  const [selected, setSelected] = useState<CaseFile | null>(null)

  const beneficiaryName = (id: string | null): string =>
    beneficiaries.find((b) => b.id === id)?.full_name ?? 'Unlinked'

  const metrics = useMemo(
    () => ({
      open: cases.filter((c) => c.status !== 'closed').length,
      critical: cases.filter((c) => c.priority === 'critical').length,
      closed: cases.filter((c) => c.status === 'closed').length,
      avgDays: cases.filter((c) => c.closed_on).length
        ? Math.round(
            cases
              .filter((c) => c.closed_on)
              .reduce(
                (total, c) =>
                  total + (new Date(c.closed_on as string).getTime() - new Date(c.opened_on).getTime()) / 86_400_000,
                0,
              ) / cases.filter((c) => c.closed_on).length,
          )
        : 0,
    }),
    [cases],
  )

  const aiContext = useMemo(
    () =>
      [
        `Cases: ${cases.length} total, ${metrics.open} open, ${metrics.critical} critical priority. Average resolution ${metrics.avgDays} days.`,
        ...cases
          .slice(0, 60)
          .map(
            (c) =>
              `${c.code} — ${c.case_type}, priority ${c.priority}, status ${c.status}, opened ${formatDate(c.opened_on)}. ${c.summary ?? ''}`,
          ),
      ].join('\n'),
    [cases, metrics],
  )

  const selectedNotes = notes.filter((note) => note.case_id === selected?.id)

  return (
    <AppShell aiModule="cases" aiContext={aiContext}>
      <PageHeader
        title="Case Management"
        subtitle="Individual protection and support cases from intake through to closure"
        icon={LifeBuoy}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Cases' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Open cases" value={formatNumber(metrics.open)} icon={LifeBuoy} loading={isLoading} />
        <KPICard title="Critical priority" value={formatNumber(metrics.critical)} icon={ShieldCheck} loading={isLoading} />
        <KPICard title="Closed cases" value={formatNumber(metrics.closed)} icon={UserCheck} loading={isLoading} />
        <KPICard title="Average resolution" value={`${metrics.avgDays} days`} icon={Home} loading={isLoading} />
      </KPICardGrid>

      <DataTable<CaseFile>
        data={cases}
        loading={isLoading}
        exportName="cases"
        exportTitle="Case Register"
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: 'code', header: 'Case', render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
          {
            key: 'beneficiary',
            header: 'Beneficiary',
            value: (row) => beneficiaryName(row.beneficiary_id),
            render: (row) => beneficiaryName(row.beneficiary_id),
          },
          { key: 'case_type', header: 'Type' },
          {
            key: 'priority',
            header: 'Priority',
            render: (row) => (
              <Badge tone={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'neutral'}>
                {titleCase(row.priority)}
              </Badge>
            ),
          },
          { key: 'opened_on', header: 'Opened', render: (row) => formatDate(row.opened_on) },
          { key: 'closed_on', header: 'Closed', render: (row) => formatDate(row.closed_on) },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
        ]}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: optionsOf(['open', 'assessment', 'intervention', 'referred', 'follow_up', 'closed']),
            match: (row, value) => row.status === value,
          },
          {
            key: 'priority',
            label: 'Priority',
            options: optionsOf(['low', 'medium', 'high', 'critical']),
            match: (row, value) => row.priority === value,
          },
        ]}
      />

      <NegoModal
        title={selected ? `Case ${selected.code}` : ''}
        description={selected ? `${selected.case_type} · ${titleCase(selected.status)}` : undefined}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Beneficiary', beneficiaryName(selected.beneficiary_id)],
                ['Priority', titleCase(selected.priority)],
                ['Opened', formatDate(selected.opened_on)],
                ['Closed', formatDate(selected.closed_on)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-3">{label}</dt>
                  <dd className="mt-0.5 text-sm text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>

            {selected.summary ? (
              <div>
                <p className="nl-section-title mb-1">Summary</p>
                <p className="text-sm leading-relaxed text-ink-2">{selected.summary}</p>
              </div>
            ) : null}

            {selected.outcome ? (
              <div>
                <p className="nl-section-title mb-1">Outcome</p>
                <p className="text-sm leading-relaxed text-ink-2">{selected.outcome}</p>
              </div>
            ) : null}

            <div>
              <p className="nl-section-title mb-2">Case notes ({selectedNotes.length})</p>
              {selectedNotes.length ? (
                <ul className="space-y-3">
                  {[...selectedNotes]
                    .sort((a, b) => b.note_date.localeCompare(a.note_date))
                    .map((note) => (
                      <li key={note.id} className="border-l-2 pl-3" style={{ borderColor: 'var(--accent-border)' }}>
                        <div className="mb-1 flex items-center gap-2">
                          <Badge tone="accent">{titleCase(note.note_type)}</Badge>
                          <span className="text-[11px] text-ink-3">{formatDate(note.note_date)}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-ink-2">{note.content}</p>
                        {note.referred_to ? (
                          <p className="mt-1 text-[11px] text-ink-3">Referred to: {note.referred_to}</p>
                        ) : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-3">No notes recorded on this case.</p>
              )}
            </div>
          </div>
        ) : null}
      </NegoModal>
    </AppShell>
  )
}

/* ------------------------------------------------------ Field operations */

export const FieldOperationsPage: FC = () => {
  const { data: visits = [], isLoading } = useCollection<FieldVisit>(TABLES.fieldVisits)
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)

  const metrics = useMemo(
    () => ({
      total: visits.length,
      participants: visits.reduce((total, visit) => total + visit.participants_count, 0),
      female: visits.reduce((total, visit) => total + visit.female_count, 0),
      pendingSync: visits.filter((visit) => visit.synced_offline).length,
      locations: new Set(visits.map((visit) => visit.location)).size,
    }),
    [visits],
  )

  const byState = useMemo(
    () =>
      Object.entries(groupBy(visits.filter((v) => v.state), (v) => v.state as string))
        .map(([name, list]) => ({ name, visits: list.length, participants: list.reduce((t, v) => t + v.participants_count, 0) }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 8),
    [visits],
  )

  const aiContext = useMemo(
    () =>
      [
        `Field visits: ${visits.length} recorded across ${metrics.locations} locations, reaching ${formatNumber(metrics.participants)} participants (${formatNumber(metrics.female)} female).`,
        ...visits
          .slice(0, 50)
          .map(
            (visit) =>
              `${visit.code} — ${visit.visit_type} on ${formatDate(visit.visit_date)} at ${visit.location}, ${visit.state ?? ''}. ${visit.participants_count} participants. Findings: ${visit.findings ?? 'none recorded'}`,
          ),
      ].join('\n'),
    [visits, metrics],
  )

  return (
    <AppShell aiModule="field" aiContext={aiContext}>
      <PageHeader
        title="Field Operations"
        subtitle="GPS-tagged monitoring, verification and distribution activity"
        icon={MapPinned}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Field Operations' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Field visits" value={formatNumber(metrics.total)} icon={MapPinned} hint={`${metrics.locations} distinct locations`} loading={isLoading} />
        <KPICard title="Participants reached" value={formatNumber(metrics.participants)} icon={UsersRound} loading={isLoading} />
        <KPICard
          title="Female participation"
          value={formatPercent(metrics.participants ? (metrics.female / metrics.participants) * 100 : 0)}
          icon={UserCheck}
          loading={isLoading}
        />
        <KPICard
          title="Captured offline"
          value={formatNumber(metrics.pendingSync)}
          icon={ShieldCheck}
          hint="Recorded without connectivity"
          loading={isLoading}
        />
      </KPICardGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Coverage by location" subtitle="Visits and participants by state">
          {byState.length ? (
            <ComparisonBars
              data={byState.map((row) => ({ name: row.name, visits: row.visits }))}
              series={[{ key: 'visits', label: 'Visits' }]}
              layout="vertical"
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No field visits recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Visit types" subtitle="Composition of field activity">
          {visits.length ? (
            <DonutChart
              data={Object.entries(groupBy(visits, (visit) => titleCase(visit.visit_type))).map(([name, list]) => ({
                name,
                value: list.length,
              }))}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No field visits recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <DataTable<FieldVisit>
        data={visits}
        loading={isLoading}
        exportName="field-visits"
        exportTitle="Field Visit Register"
        columns={[
          { key: 'code', header: 'Reference', render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
          { key: 'visit_date', header: 'Date', render: (row) => formatDate(row.visit_date) },
          { key: 'visit_type', header: 'Type', render: (row) => titleCase(row.visit_type) },
          { key: 'location', header: 'Location' },
          { key: 'state', header: 'State' },
          {
            key: 'project',
            header: 'Project',
            value: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '',
            render: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '—',
            hideOnMobile: true,
          },
          { key: 'participants_count', header: 'Participants', align: 'right', render: (row) => formatNumber(row.participants_count) },
          {
            key: 'coordinates',
            header: 'GPS',
            sortable: false,
            hideOnMobile: true,
            render: (row) =>
              row.latitude && row.longitude ? (
                <span className="font-mono text-[11px] text-ink-3">
                  {row.latitude.toFixed(3)}, {row.longitude.toFixed(3)}
                </span>
              ) : (
                '—'
              ),
          },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
        ]}
        filters={[
          {
            key: 'type',
            label: 'Visit type',
            options: optionsOf(['monitoring', 'verification', 'distribution', 'assessment', 'supervision']),
            match: (row, value) => row.visit_type === value,
          },
          {
            key: 'status',
            label: 'Status',
            options: optionsOf(['planned', 'completed', 'submitted', 'approved']),
            match: (row, value) => row.status === value,
          },
        ]}
      />
    </AppShell>
  )
}
