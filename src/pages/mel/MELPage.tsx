import { useMemo, useState, type FC } from 'react'
import { BarChart3, BookOpen, GraduationCap, Layers, Plus, Target, TrendingUp } from 'lucide-react'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import {
  Badge,
  ChartCard,
  EmptyState,
  KPICard,
  KPICardGrid,
  PageHeader,
  ProgressBar,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { RecordForm, type FormValues } from '@/components/negolinks/RecordForm'
import { ComparisonBars, PerformanceRadar } from '@/components/charts'
import { useCollection, useCreateRecord, useUpdateRecord } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { useAppStore } from '@/stores/app.store'
import { formatDate, formatNumber, formatPercent, percentOf, titleCase } from '@/lib/utils'
import type { Evaluation, Indicator, IndicatorResult, LearningEntry, LogframeRow, Project } from '@/types'

const LEVELS = ['input', 'activity', 'output', 'outcome', 'impact']

const optionsOf = (values: string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

export const MELPage: FC = () => {
  const can = useAppStore((state) => state.can)
  const { data: indicators = [], isLoading } = useCollection<Indicator>(TABLES.indicators)
  const { data: results = [] } = useCollection<IndicatorResult>(TABLES.indicatorResults)
  const { data: evaluations = [] } = useCollection<Evaluation>(TABLES.evaluations)
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)
  const create = useCreateRecord<Record<string, unknown>>(TABLES.indicators, 'Indicator')
  const update = useUpdateRecord<Record<string, unknown>>(TABLES.indicators, 'Indicator')

  const [tab, setTab] = useState('indicators')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Indicator | null>(null)

  const projectName = (id: string | null): string => projects.find((p) => p.id === id)?.title ?? '—'

  const metrics = useMemo(() => {
    const onTrack = indicators.filter((i) => i.target_value > 0 && i.actual_value / i.target_value >= 0.8)
    const behind = indicators.filter((i) => i.target_value > 0 && i.actual_value / i.target_value < 0.5)
    const achievement = indicators.length
      ? indicators.reduce((total, i) => total + (i.target_value ? Math.min(1, i.actual_value / i.target_value) : 0), 0) /
        indicators.length
      : 0
    const femaleShare = results.length
      ? results.reduce((total, r) => total + r.female_value, 0) /
        Math.max(1, results.reduce((total, r) => total + r.value, 0))
      : 0
    return { onTrack, behind, achievement: achievement * 100, femaleShare: femaleShare * 100 }
  }, [indicators, results])

  const levelPerformance = useMemo(
    () =>
      LEVELS.map((level) => {
        const list = indicators.filter((i) => i.level === level)
        const achievement = list.length
          ? (list.reduce((total, i) => total + (i.target_value ? Math.min(1, i.actual_value / i.target_value) : 0), 0) /
              list.length) *
            100
          : 0
        return { subject: titleCase(level), value: Math.round(achievement), target: 100 }
      }).filter((row) => indicators.some((i) => i.level.toLowerCase() === row.subject.toLowerCase())),
    [indicators],
  )

  const aiContext = useMemo(
    () =>
      [
        `Indicators: ${indicators.length} tracked. ${metrics.onTrack.length} at or above 80% of target, ${metrics.behind.length} below 50%.`,
        `Average achievement ${formatPercent(metrics.achievement)}. Female share of reported results ${formatPercent(metrics.femaleShare)}.`,
        `Evaluations: ${evaluations.length} recorded, ${evaluations.filter((e) => ['completed', 'published'].includes(e.status)).length} completed.`,
        ...indicators.map(
          (indicator) =>
            `${indicator.code} — ${indicator.name} (${indicator.level}). Baseline ${indicator.baseline_value}, target ${indicator.target_value} ${indicator.unit}, actual ${indicator.actual_value} (${formatPercent(percentOf(indicator.actual_value, indicator.target_value))} of target). Project: ${projectName(indicator.project_id)}. Verification: ${indicator.means_of_verification ?? 'not recorded'}.`,
        ),
        ...evaluations
          .filter((e) => e.key_findings)
          .map((e) => `Evaluation "${e.title}" (${e.evaluation_type}): ${e.key_findings}`),
      ].join('\n'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indicators, metrics, evaluations, projects],
  )

  const indicatorFields = [
    { name: 'name', label: 'Indicator statement', type: 'textarea' as const, required: true, full: true },
    { name: 'code', label: 'Indicator code', type: 'text' as const, required: true },
    { name: 'level', label: 'Results level', type: 'select' as const, required: true, defaultValue: 'output', options: optionsOf(LEVELS) },
    {
      name: 'project_id',
      label: 'Project',
      type: 'select' as const,
      options: projects.map((project) => ({ value: project.id, label: project.title })),
    },
    { name: 'unit', label: 'Unit of measure', type: 'text' as const, required: true, placeholder: 'children, %, households' },
    { name: 'baseline_value', label: 'Baseline', type: 'number' as const },
    { name: 'target_value', label: 'Target', type: 'number' as const, required: true },
    { name: 'actual_value', label: 'Actual to date', type: 'number' as const },
    { name: 'disaggregation', label: 'Disaggregation', type: 'text' as const, placeholder: 'Sex, Age, Location' },
    { name: 'means_of_verification', label: 'Means of verification', type: 'textarea' as const, full: true },
    {
      name: 'frequency',
      label: 'Collection frequency',
      type: 'select' as const,
      defaultValue: 'quarterly',
      options: optionsOf(['monthly', 'quarterly', 'biannual', 'annual']),
    },
    { name: 'is_active', label: 'Active', type: 'checkbox' as const, defaultValue: true },
  ]

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!editing) return undefined
    return {
      name: editing.name,
      code: editing.code,
      level: editing.level,
      project_id: editing.project_id ?? '',
      unit: editing.unit,
      baseline_value: editing.baseline_value,
      target_value: editing.target_value,
      actual_value: editing.actual_value,
      disaggregation: editing.disaggregation ?? '',
      means_of_verification: editing.means_of_verification ?? '',
      frequency: editing.frequency,
      is_active: editing.is_active,
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

  return (
    <AppShell aiModule="mel" aiContext={aiContext}>
      <PageHeader
        title="Monitoring, Evaluation & Learning"
        subtitle="Indicators, disaggregated results, evaluations and organizational learning"
        icon={BarChart3}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'MEL' }]}
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
              <Plus size={15} /> New Indicator
            </button>
          ) : null
        }
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Indicators tracked" value={formatNumber(indicators.length)} icon={Target} hint={`${metrics.onTrack.length} on track`} loading={isLoading} />
        <KPICard title="Average achievement" value={formatPercent(metrics.achievement)} icon={TrendingUp} hint="Against target values" loading={isLoading} />
        <KPICard title="Below 50% of target" value={formatNumber(metrics.behind.length)} icon={Layers} hint="Require attention" loading={isLoading} />
        <KPICard title="Evaluations" value={formatNumber(evaluations.length)} icon={GraduationCap} hint={`${evaluations.filter((e) => ['completed', 'published'].includes(e.status)).length} completed`} loading={isLoading} />
      </KPICardGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Achievement by results level" subtitle="Input through to impact">
          {levelPerformance.length ? (
            <PerformanceRadar data={levelPerformance} />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No indicators recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Indicator performance" subtitle="Actual against target, top indicators">
          {indicators.length ? (
            <ComparisonBars
              data={[...indicators]
                .sort((a, b) => b.target_value - a.target_value)
                .slice(0, 7)
                .map((indicator) => ({
                  name: indicator.code,
                  target: indicator.target_value,
                  actual: indicator.actual_value,
                }))}
              series={[
                { key: 'target', label: 'Target' },
                { key: 'actual', label: 'Actual', color: '#22C55E' },
              ]}
              layout="vertical"
              formatter={(value) => formatNumber(value)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No indicators recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <TabBar
        tabs={[
          { key: 'indicators', label: 'Indicators', count: indicators.length },
          { key: 'results', label: 'Results data', count: results.length },
          { key: 'evaluations', label: 'Evaluations', count: evaluations.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'indicators' ? (
        <DataTable<Indicator>
          data={indicators}
          loading={isLoading}
          exportName="indicators"
          exportTitle="Indicator Framework"
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
            { key: 'name', header: 'Indicator' },
            { key: 'level', header: 'Level', render: (row) => <Badge tone="accent">{titleCase(row.level)}</Badge> },
            { key: 'baseline_value', header: 'Baseline', align: 'right', render: (row) => formatNumber(row.baseline_value) },
            { key: 'target_value', header: 'Target', align: 'right', render: (row) => `${formatNumber(row.target_value)} ${row.unit}` },
            { key: 'actual_value', header: 'Actual', align: 'right', render: (row) => formatNumber(row.actual_value) },
            {
              key: 'achievement',
              header: 'Achievement',
              value: (row) => percentOf(row.actual_value, row.target_value),
              render: (row) => (
                <ProgressBar value={percentOf(row.actual_value, row.target_value)} showLabel className="min-w-[110px]" />
              ),
            },
          ]}
          filters={[
            { key: 'level', label: 'Results level', options: optionsOf(LEVELS), match: (row, value) => row.level === value },
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

      {tab === 'results' ? (
        <DataTable<IndicatorResult>
          data={results}
          exportName="indicator-results"
          exportTitle="Disaggregated Results"
          columns={[
            {
              key: 'indicator',
              header: 'Indicator',
              value: (row) => indicators.find((i) => i.id === row.indicator_id)?.code ?? '',
              render: (row) => (
                <span className="font-semibold text-ink">{indicators.find((i) => i.id === row.indicator_id)?.code ?? '—'}</span>
              ),
            },
            { key: 'period_label', header: 'Period' },
            { key: 'value', header: 'Value', align: 'right', render: (row) => formatNumber(row.value) },
            { key: 'female_value', header: 'Female', align: 'right', render: (row) => formatNumber(row.female_value) },
            { key: 'male_value', header: 'Male', align: 'right', render: (row) => formatNumber(row.male_value) },
            { key: 'location', header: 'Location' },
            { key: 'source', header: 'Source' },
            {
              key: 'verified',
              header: 'Verified',
              render: (row) => <Badge tone={row.verified ? 'success' : 'warning'}>{row.verified ? 'Verified' : 'Pending'}</Badge>,
            },
          ]}
        />
      ) : null}

      {tab === 'evaluations' ? (
        <DataTable<Evaluation>
          data={evaluations}
          exportName="evaluations"
          exportTitle="Evaluations and Surveys"
          columns={[
            { key: 'title', header: 'Evaluation', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            { key: 'evaluation_type', header: 'Type', render: (row) => titleCase(row.evaluation_type) },
            { key: 'sample_size', header: 'Sample', align: 'right', render: (row) => formatNumber(row.sample_size) },
            { key: 'planned_date', header: 'Planned', render: (row) => formatDate(row.planned_date) },
            { key: 'completed_date', header: 'Completed', render: (row) => formatDate(row.completed_date) },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'type',
              label: 'Type',
              options: optionsOf(['baseline', 'midterm', 'endline', 'impact', 'process', 'survey']),
              match: (row, value) => row.evaluation_type === value,
            },
          ]}
        />
      ) : null}

      <RecordForm
        title={editing ? 'Edit indicator' : 'New indicator'}
        description="Define the measurement, its baseline, target and how results will be verified."
        fields={indicatorFields}
        initial={initialValues}
        isOpen={formOpen}
        submitting={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save changes' : 'Create indicator'}
      />
    </AppShell>
  )
}

/* ------------------------------------------------------------ Logframe */

export const LogframePage: FC = () => {
  const { data: rows = [], isLoading } = useCollection<LogframeRow>(TABLES.logframe)
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)
  const [projectId, setProjectId] = useState('')

  const projectsWithLogframe = useMemo(
    () => projects.filter((project) => rows.some((row) => row.project_id === project.id)),
    [projects, rows],
  )

  const selected = projectId || projectsWithLogframe[0]?.id || ''
  const filtered = useMemo(
    () => rows.filter((row) => row.project_id === selected).sort((a, b) => a.sort_order - b.sort_order),
    [rows, selected],
  )

  const aiContext = useMemo(
    () =>
      filtered
        .map(
          (row) =>
            `${titleCase(row.level)}: ${row.statement}. Indicator: ${row.indicator ?? 'not set'}. Baseline ${row.baseline ?? '—'}, target ${row.target ?? '—'}, actual ${row.actual ?? '—'}. Verification: ${row.means_of_verification ?? '—'}. Assumptions: ${row.assumptions ?? '—'}.`,
        )
        .join('\n'),
    [filtered],
  )

  return (
    <AppShell aiModule="mel" aiContext={aiContext}>
      <PageHeader
        title="Logical Framework"
        subtitle="Goal, impact, outcomes, outputs and activities with verification and assumptions"
        icon={Target}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Logframe' }]}
        actions={
          projectsWithLogframe.length ? (
            <select className="nl-input w-auto min-w-[220px]" value={selected} onChange={(event) => setProjectId(event.target.value)}>
              {projectsWithLogframe.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {isLoading ? (
        <div className="nl-skeleton h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <div className="nl-card">
          <EmptyState
            icon={Target}
            title="No logframe recorded"
            description="Logframes are created alongside a project. Load demo data or add logframe rows to a project to see the results chain here."
          />
        </div>
      ) : (
        <div className="nl-card overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-card-alt/60">
                {['Level', 'Statement', 'Indicator', 'Baseline', 'Target', 'Actual', 'Verification', 'Assumptions'].map((header) => (
                  <th
                    key={header}
                    className="border-b-2 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-2"
                    style={{ borderBottomColor: 'var(--accent-border)' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Badge tone={row.level === 'goal' || row.level === 'impact' ? 'accent' : 'neutral'}>
                      {titleCase(row.level)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink">{row.statement}</td>
                  <td className="px-4 py-3 text-ink-2">{row.indicator ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-2">{row.baseline ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-2">{row.target ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{row.actual ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-3">{row.means_of_verification ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-3">{row.assumptions ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}

/* ------------------------------------------------------------ Learning */

export const LearningPage: FC = () => {
  const { data: entries = [], isLoading } = useCollection<LearningEntry>(TABLES.learning)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? entries : entries.filter((entry) => entry.entry_type === filter)

  const aiContext = useMemo(
    () =>
      entries
        .map((entry) => `${titleCase(entry.entry_type)} — ${entry.title} (${entry.category ?? 'general'}): ${entry.content}`)
        .join('\n'),
    [entries],
  )

  return (
    <AppShell aiModule="mel" aiContext={aiContext}>
      <PageHeader
        title="Learning & Knowledge"
        subtitle="Lessons learned, best practice, success stories and the organizational knowledge base"
        icon={BookOpen}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Learning' }]}
      />

      <TabBar
        tabs={[
          { key: 'all', label: 'Everything', count: entries.length },
          { key: 'lesson', label: 'Lessons', count: entries.filter((e) => e.entry_type === 'lesson').length },
          { key: 'best_practice', label: 'Best practice', count: entries.filter((e) => e.entry_type === 'best_practice').length },
          { key: 'success_story', label: 'Success stories', count: entries.filter((e) => e.entry_type === 'success_story').length },
          { key: 'knowledge', label: 'Knowledge', count: entries.filter((e) => e.entry_type === 'knowledge').length },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="nl-skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="nl-card">
          <EmptyState
            icon={BookOpen}
            title="Nothing captured yet"
            description="Lessons, best practice and success stories recorded by your teams will appear here."
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
            <article key={entry.id} className="nl-card flex flex-col p-5">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={entry.entry_type === 'success_story' ? 'success' : 'accent'}>
                  {titleCase(entry.entry_type)}
                </Badge>
                {entry.category ? <span className="text-[11px] text-ink-3">{entry.category}</span> : null}
              </div>
              <h3 className="font-display text-sm font-bold text-ink">{entry.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-2">{entry.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {entry.tags?.map((tag) => (
                  <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-3">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-ink-3">{formatDate(entry.entry_date)}</p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  )
}
