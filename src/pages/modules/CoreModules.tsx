import { type FC } from 'react'
import {
  Briefcase,
  Compass,
  FolderKanban,
  Handshake,
  HeartHandshake,
  Target,
  TrendingUp,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { ModulePage } from '@/components/negolinks/ModulePage'
import { Badge, ChartCard, ProgressBar, statusTone } from '@/components/negolinks/Primitives'
import { ComparisonBars, DonutChart } from '@/components/charts'
import { TABLES } from '@/lib/tables'
import {
  DONOR_TYPES,
  ORGANIZATION_TYPES,
  PROJECT_STATUSES,
} from '@/constants'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  groupBy,
  sum,
  titleCase,
  toMajor,
} from '@/lib/utils'
import type { Donor, Employee, Partner, Program, Project, Volunteer } from '@/types'

const asOptions = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

/* ---------------------------------------------------------- Programmes */

export const ProgramsPage: FC = () => (
  <ModulePage<Program>
    title="Programs"
    subtitle="Multi-year thematic programmes and the projects delivered under them"
    icon={Compass}
    aiModule="programs"
    table={TABLES.programs}
    recordLabel="Program"
    moneyFields={['budget_minor']}
    columns={[
      { key: 'name', header: 'Programme', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: 'code', header: 'Code' },
      { key: 'category', header: 'Category' },
      {
        key: 'budget_minor',
        header: 'Budget',
        align: 'right',
        value: (row) => row.budget_minor,
        render: (row) => formatCurrency(row.budget_minor, row.currency),
      },
      {
        key: 'target_beneficiaries',
        header: 'Target reach',
        align: 'right',
        render: (row) => formatNumber(row.target_beneficiaries),
      },
      { key: 'end_date', header: 'Ends', render: (row) => formatDate(row.end_date) },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'status',
        label: 'Status',
        options: asOptions(['planning', 'active', 'on_hold', 'completed', 'closed']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'name', label: 'Programme name', type: 'text', required: true, full: true },
      { name: 'code', label: 'Programme code', type: 'text', required: true, placeholder: 'PRG-001' },
      { name: 'category', label: 'Thematic area', type: 'text', required: true, placeholder: 'Education' },
      { name: 'goal', label: 'Programme goal', type: 'textarea', full: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'end_date', label: 'End date', type: 'date' },
      { name: 'budget_minor', label: 'Budget', type: 'money', hint: 'In your base currency' },
      { name: 'target_beneficiaries', label: 'Target beneficiaries', type: 'number' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'planning',
        options: asOptions(['planning', 'active', 'on_hold', 'completed', 'closed']),
      },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
    ]}
    kpis={(rows, currency) => [
      { label: 'Programmes', value: formatNumber(rows.length), icon: Compass, hint: `${rows.filter((r) => r.status === 'active').length} active` },
      { label: 'Committed budget', value: formatCompactCurrency(sum(rows, (r) => r.budget_minor), currency), icon: Wallet },
      { label: 'Target reach', value: formatNumber(sum(rows, (r) => r.target_beneficiaries)), icon: UsersRound },
      { label: 'Thematic areas', value: formatNumber(new Set(rows.map((r) => r.category)).size), icon: Target },
    ]}
    charts={(rows, currency) => (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Budget by thematic area" subtitle="Committed programme funding">
          <ComparisonBars
            data={Object.entries(groupBy(rows, (row) => row.category)).map(([name, list]) => ({
              name,
              value: Math.round(toMajor(sum(list, (r) => r.budget_minor))),
            }))}
            series={[{ key: 'value', label: 'Budget' }]}
            layout="vertical"
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
        <ChartCard title="Programmes by status" subtitle="Portfolio distribution">
          <DonutChart
            data={Object.entries(groupBy(rows, (row) => titleCase(row.status))).map(([name, list]) => ({
              name,
              value: list.length,
            }))}
          />
        </ChartCard>
      </div>
    )}
    aiContext={(rows, currency) =>
      [
        `Programmes: ${rows.length} on file.`,
        ...rows.map(
          (row) =>
            `${row.name} (${row.code}) — ${row.category}, status ${row.status}, budget ${formatCurrency(row.budget_minor, currency)}, target ${formatNumber(row.target_beneficiaries)} beneficiaries, runs ${formatDate(row.start_date)} to ${formatDate(row.end_date)}.`,
        ),
      ].join('\n')
    }
  />
)

/* ------------------------------------------------------------ Projects */

export const ProjectsPage: FC = () => (
  <ModulePage<Project>
    title="Projects"
    subtitle="Project lifecycle from proposal through implementation to closure"
    icon={FolderKanban}
    aiModule="projects"
    table={TABLES.projects}
    recordLabel="Project"
    moneyFields={['budget_minor', 'spent_minor']}
    columns={[
      { key: 'title', header: 'Project', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { key: 'code', header: 'Code' },
      { key: 'sector', header: 'Sector' },
      { key: 'location', header: 'Location', render: (row) => row.location ?? row.state ?? '—' },
      {
        key: 'budget_minor',
        header: 'Budget',
        align: 'right',
        value: (row) => row.budget_minor,
        render: (row) => formatCurrency(row.budget_minor, row.currency),
      },
      {
        key: 'progress_percent',
        header: 'Progress',
        value: (row) => row.progress_percent,
        render: (row) => <ProgressBar value={row.progress_percent} showLabel className="min-w-[110px]" />,
      },
      {
        key: 'reached_beneficiaries',
        header: 'Reached',
        align: 'right',
        render: (row) => `${formatNumber(row.reached_beneficiaries)} / ${formatNumber(row.target_beneficiaries)}`,
      },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      { key: 'status', label: 'Status', options: asOptions(PROJECT_STATUSES), match: (row, value) => row.status === value },
      {
        key: 'risk',
        label: 'Risk level',
        options: asOptions(['low', 'medium', 'high']),
        match: (row, value) => row.risk_level === value,
      },
    ]}
    fields={[
      { name: 'title', label: 'Project title', type: 'text', required: true, full: true },
      { name: 'code', label: 'Project code', type: 'text', required: true, placeholder: 'NGO/PRJ/2026/0001' },
      { name: 'sector', label: 'Sector', type: 'text', required: true, placeholder: 'Education' },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'funding_source', label: 'Funding source', type: 'text' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'draft',
        options: asOptions(PROJECT_STATUSES),
      },
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'end_date', label: 'End date', type: 'date' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'Jos North, Plateau' },
      { name: 'state', label: 'State / Region', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', defaultValue: 'Nigeria' },
      { name: 'budget_minor', label: 'Budget', type: 'money' },
      { name: 'spent_minor', label: 'Spent to date', type: 'money' },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
      { name: 'progress_percent', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
      { name: 'target_beneficiaries', label: 'Target beneficiaries', type: 'number' },
      { name: 'reached_beneficiaries', label: 'Beneficiaries reached', type: 'number' },
      {
        name: 'risk_level',
        label: 'Risk level',
        type: 'select',
        defaultValue: 'low',
        options: asOptions(['low', 'medium', 'high']),
      },
      { name: 'closure_note', label: 'Closure note', type: 'textarea', full: true },
    ]}
    kpis={(rows, currency) => [
      {
        label: 'Total projects',
        value: formatNumber(rows.length),
        icon: FolderKanban,
        hint: `${rows.filter((r) => r.status === 'active').length} active`,
      },
      { label: 'Portfolio budget', value: formatCompactCurrency(sum(rows, (r) => r.budget_minor), currency), icon: Wallet },
      {
        label: 'Average completion',
        value: `${rows.length ? Math.round(sum(rows, (r) => r.progress_percent) / rows.length) : 0}%`,
        icon: TrendingUp,
      },
      { label: 'Beneficiaries reached', value: formatNumber(sum(rows, (r) => r.reached_beneficiaries)), icon: UsersRound },
    ]}
    charts={(rows, currency) => (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Budget versus spend by sector" subtitle="Portfolio financial position">
          <ComparisonBars
            data={Object.entries(groupBy(rows, (row) => row.sector)).map(([name, list]) => ({
              name,
              budget: Math.round(toMajor(sum(list, (r) => r.budget_minor))),
              spent: Math.round(toMajor(sum(list, (r) => r.spent_minor))),
            }))}
            series={[
              { key: 'budget', label: 'Budget' },
              { key: 'spent', label: 'Spent', color: '#22C55E' },
            ]}
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
        <ChartCard title="Projects by status" subtitle="Lifecycle distribution">
          <DonutChart
            data={Object.entries(groupBy(rows, (row) => titleCase(row.status))).map(([name, list]) => ({
              name,
              value: list.length,
            }))}
          />
        </ChartCard>
      </div>
    )}
    aiContext={(rows, currency) =>
      [
        `Projects: ${rows.length} total, ${rows.filter((r) => r.status === 'active').length} active.`,
        `Portfolio budget ${formatCurrency(sum(rows, (r) => r.budget_minor), currency)}, spent ${formatCurrency(sum(rows, (r) => r.spent_minor), currency)}.`,
        ...rows.map(
          (row) =>
            `${row.title} (${row.code}) — ${row.sector} in ${row.location ?? row.state ?? 'unspecified location'}, status ${row.status}, ${row.progress_percent}% complete, budget ${formatCurrency(row.budget_minor, row.currency)}, spent ${formatCurrency(row.spent_minor, row.currency)}, reached ${formatNumber(row.reached_beneficiaries)} of ${formatNumber(row.target_beneficiaries)} beneficiaries, risk ${row.risk_level}.`,
        ),
      ].join('\n')
    }
  />
)

/* -------------------------------------------------------------- Donors */

export const DonorsPage: FC = () => (
  <ModulePage<Donor>
    title="Donors"
    subtitle="Institutional, corporate and individual funders and their giving history"
    icon={HeartHandshake}
    aiModule="donors"
    table={TABLES.donors}
    recordLabel="Donor"
    moneyFields={['total_committed_minor', 'total_received_minor']}
    columns={[
      { key: 'name', header: 'Donor', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: 'donor_type', header: 'Type' },
      { key: 'country', header: 'Country' },
      { key: 'contact_person', header: 'Contact' },
      {
        key: 'total_committed_minor',
        header: 'Committed',
        align: 'right',
        value: (row) => row.total_committed_minor,
        render: (row) => formatCurrency(row.total_committed_minor, row.currency),
      },
      {
        key: 'total_received_minor',
        header: 'Received',
        align: 'right',
        value: (row) => row.total_received_minor,
        render: (row) => formatCurrency(row.total_received_minor, row.currency),
      },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      { key: 'type', label: 'Donor type', options: asOptions(DONOR_TYPES), match: (row, value) => row.donor_type === value },
      {
        key: 'status',
        label: 'Status',
        options: asOptions(['prospect', 'active', 'dormant', 'closed']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'name', label: 'Donor name', type: 'text', required: true, full: true },
      { name: 'code', label: 'Donor code', type: 'text', required: true, placeholder: 'DNR-001' },
      { name: 'donor_type', label: 'Donor type', type: 'select', required: true, options: asOptions(DONOR_TYPES) },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'contact_person', label: 'Contact person', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'website', label: 'Website', type: 'text' },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
      { name: 'reporting_requirements', label: 'Reporting requirements', type: 'textarea', full: true },
      { name: 'preferences', label: 'Funding preferences', type: 'textarea', full: true },
      { name: 'total_committed_minor', label: 'Total committed', type: 'money' },
      { name: 'total_received_minor', label: 'Total received', type: 'money' },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'active',
        options: asOptions(['prospect', 'active', 'dormant', 'closed']),
      },
    ]}
    kpis={(rows, currency) => [
      { label: 'Donors', value: formatNumber(rows.length), icon: HeartHandshake, hint: `${rows.filter((r) => r.status === 'active').length} active` },
      { label: 'Total committed', value: formatCompactCurrency(sum(rows, (r) => r.total_committed_minor), currency), icon: Target },
      { label: 'Total received', value: formatCompactCurrency(sum(rows, (r) => r.total_received_minor), currency), icon: Wallet },
      {
        label: 'Collection rate',
        value: `${
          sum(rows, (r) => r.total_committed_minor)
            ? Math.round((sum(rows, (r) => r.total_received_minor) / sum(rows, (r) => r.total_committed_minor)) * 100)
            : 0
        }%`,
        icon: TrendingUp,
      },
    ]}
    charts={(rows, currency) => (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top donors by funds received" subtitle="Largest contributors">
          <ComparisonBars
            data={[...rows]
              .sort((a, b) => b.total_received_minor - a.total_received_minor)
              .slice(0, 8)
              .map((row) => ({ name: row.name.slice(0, 24), value: Math.round(toMajor(row.total_received_minor)) }))}
            series={[{ key: 'value', label: 'Received' }]}
            layout="vertical"
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
        <ChartCard title="Donors by type" subtitle="Funding base composition">
          <DonutChart
            data={Object.entries(groupBy(rows, (row) => row.donor_type)).map(([name, list]) => ({
              name,
              value: list.length,
            }))}
          />
        </ChartCard>
      </div>
    )}
    aiContext={(rows, currency) =>
      [
        `Donors: ${rows.length} on file. Total received ${formatCurrency(sum(rows, (r) => r.total_received_minor), currency)}.`,
        ...[...rows]
          .sort((a, b) => b.total_received_minor - a.total_received_minor)
          .map(
            (row) =>
              `${row.name} (${row.donor_type}, ${row.country ?? 'unspecified'}) — committed ${formatCurrency(row.total_committed_minor, row.currency)}, received ${formatCurrency(row.total_received_minor, row.currency)}, status ${row.status}. Reporting: ${row.reporting_requirements ?? 'not recorded'}.`,
          ),
      ].join('\n')
    }
  />
)

/* ------------------------------------------------------------ Partners */

export const PartnersPage: FC = () => (
  <ModulePage<Partner>
    title="Partners"
    subtitle="Implementing partners, suppliers, consultants and government counterparts"
    icon={Handshake}
    aiModule="partners"
    table={TABLES.partners}
    recordLabel="Partner"
    moneyFields={['total_paid_minor']}
    columns={[
      { key: 'name', header: 'Partner', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: 'partner_type', header: 'Type', render: (row) => titleCase(row.partner_type) },
      { key: 'contact_person', header: 'Contact' },
      { key: 'agreement_end', header: 'Agreement ends', render: (row) => formatDate(row.agreement_end) },
      {
        key: 'capacity_score',
        header: 'Capacity',
        align: 'right',
        render: (row) => <ProgressBar value={row.capacity_score} showLabel className="min-w-[100px]" />,
      },
      {
        key: 'compliance_status',
        header: 'Compliance',
        render: (row) => <Badge tone={statusTone(row.compliance_status)}>{titleCase(row.compliance_status)}</Badge>,
      },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'type',
        label: 'Partner type',
        options: asOptions(['local', 'government', 'implementing', 'community', 'consultant', 'contractor', 'vendor']),
        match: (row, value) => row.partner_type === value,
      },
      {
        key: 'compliance',
        label: 'Compliance',
        options: asOptions(['compliant', 'pending_review', 'non_compliant']),
        match: (row, value) => row.compliance_status === value,
      },
    ]}
    fields={[
      { name: 'name', label: 'Partner name', type: 'text', required: true, full: true },
      { name: 'code', label: 'Partner code', type: 'text', required: true },
      {
        name: 'partner_type',
        label: 'Partner type',
        type: 'select',
        required: true,
        options: asOptions(['local', 'government', 'implementing', 'community', 'consultant', 'contractor', 'vendor']),
      },
      { name: 'contact_person', label: 'Contact person', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'country', label: 'Country', type: 'text', defaultValue: 'Nigeria' },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
      { name: 'agreement_ref', label: 'Agreement reference', type: 'text' },
      { name: 'agreement_start', label: 'Agreement start', type: 'date' },
      { name: 'agreement_end', label: 'Agreement end', type: 'date' },
      { name: 'capacity_score', label: 'Capacity score (%)', type: 'number', min: 0, max: 100 },
      {
        name: 'compliance_status',
        label: 'Compliance status',
        type: 'select',
        defaultValue: 'compliant',
        options: asOptions(['compliant', 'pending_review', 'non_compliant']),
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'active',
        options: asOptions(['active', 'inactive', 'blacklisted']),
      },
      { name: 'total_paid_minor', label: 'Total paid to date', type: 'money' },
    ]}
    kpis={(rows, currency) => [
      { label: 'Partners', value: formatNumber(rows.length), icon: Handshake, hint: `${rows.filter((r) => r.status === 'active').length} active` },
      {
        label: 'Compliant',
        value: formatNumber(rows.filter((r) => r.compliance_status === 'compliant').length),
        icon: Target,
        hint: `${rows.filter((r) => r.compliance_status === 'non_compliant').length} non-compliant`,
      },
      { label: 'Total disbursed', value: formatCompactCurrency(sum(rows, (r) => r.total_paid_minor), currency), icon: Wallet },
      {
        label: 'Average capacity',
        value: `${rows.length ? Math.round(sum(rows, (r) => r.capacity_score) / rows.length) : 0}%`,
        icon: TrendingUp,
      },
    ]}
    aiContext={(rows, currency) =>
      [
        `Partners: ${rows.length}. Total disbursed ${formatCurrency(sum(rows, (r) => r.total_paid_minor), currency)}.`,
        ...rows.map(
          (row) =>
            `${row.name} (${row.partner_type}) — compliance ${row.compliance_status}, capacity ${row.capacity_score}%, agreement to ${formatDate(row.agreement_end)}, paid ${formatCurrency(row.total_paid_minor, 'NGN')}.`,
        ),
      ].join('\n')
    }
  />
)

/* ---------------------------------------------------------- Volunteers */

export const VolunteersPage: FC = () => (
  <ModulePage<Volunteer>
    title="Volunteers"
    subtitle="Volunteer register, skills, assignments and contributed hours"
    icon={UsersRound}
    aiModule="volunteers"
    table={TABLES.volunteers}
    recordLabel="Volunteer"
    columns={[
      { key: 'full_name', header: 'Volunteer', render: (row) => <span className="font-semibold text-ink">{row.full_name}</span> },
      { key: 'code', header: 'Code' },
      { key: 'location', header: 'Location' },
      {
        key: 'skills',
        header: 'Skills',
        sortable: false,
        render: (row) => (row.skills?.length ? row.skills.slice(0, 2).join(', ') : '—'),
      },
      { key: 'total_hours', header: 'Hours', align: 'right', render: (row) => formatNumber(row.total_hours) },
      { key: 'rating', header: 'Rating', align: 'right', render: (row) => `${row.rating.toFixed(1)} / 5` },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'status',
        label: 'Status',
        options: asOptions(['applicant', 'active', 'inactive']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'code', label: 'Volunteer code', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'availability', label: 'Availability', type: 'select', options: asOptions(['Weekdays', 'Weekends', 'Full-time', 'On-call', 'Evenings']) },
      {
        name: 'skills',
        label: 'Skills',
        type: 'multiselect',
        full: true,
        options: asOptions([
          'Community Mobilisation',
          'Data Collection',
          'Health Education',
          'Teaching',
          'Translation',
          'Logistics',
          'First Aid',
          'Counselling',
          'Photography',
          'Facilitation',
        ]),
      },
      { name: 'joined_on', label: 'Joined on', type: 'date' },
      { name: 'total_hours', label: 'Hours contributed', type: 'number' },
      { name: 'rating', label: 'Performance rating', type: 'number', min: 0, max: 5 },
      { name: 'certifications', label: 'Certifications', type: 'text' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'active',
        options: asOptions(['applicant', 'active', 'inactive']),
      },
    ]}
    kpis={(rows) => [
      { label: 'Volunteers', value: formatNumber(rows.length), icon: UsersRound, hint: `${rows.filter((r) => r.status === 'active').length} active` },
      { label: 'Hours contributed', value: formatNumber(sum(rows, (r) => r.total_hours)), icon: TrendingUp },
      {
        label: 'Average rating',
        value: rows.length ? (sum(rows, (r) => r.rating) / rows.length).toFixed(1) : '—',
        icon: Target,
      },
      { label: 'Locations', value: formatNumber(new Set(rows.map((r) => r.location).filter(Boolean)).size), icon: Compass },
    ]}
    aiContext={(rows) =>
      [
        `Volunteers: ${rows.length}, ${rows.filter((r) => r.status === 'active').length} active, ${formatNumber(sum(rows, (r) => r.total_hours))} hours contributed.`,
        ...rows
          .slice(0, 60)
          .map((row) => `${row.full_name} (${row.code}) — ${row.location ?? 'unspecified'}, ${row.total_hours} hours, rating ${row.rating}, status ${row.status}.`),
      ].join('\n')
    }
  />
)

/* ------------------------------------------------------------ Staff/HR */

export const HRPage: FC = () => (
  <ModulePage<Employee>
    title="Staff & HR"
    subtitle="Employee register, positions, duty stations and employment status"
    icon={Briefcase}
    aiModule="hr"
    table={TABLES.employees}
    recordLabel="Employee"
    moneyFields={['gross_salary_minor']}
    columns={[
      { key: 'full_name', header: 'Name', render: (row) => <span className="font-semibold text-ink">{row.full_name}</span> },
      { key: 'staff_no', header: 'Staff no.' },
      { key: 'position', header: 'Position' },
      { key: 'employment_type', header: 'Type', render: (row) => titleCase(row.employment_type) },
      { key: 'duty_station', header: 'Duty station' },
      { key: 'hire_date', header: 'Hired', render: (row) => formatDate(row.hire_date) },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'status',
        label: 'Status',
        options: asOptions(['active', 'on_leave', 'suspended', 'exited']),
        match: (row, value) => row.status === value,
      },
      {
        key: 'type',
        label: 'Employment type',
        options: asOptions(['full_time', 'part_time', 'contract', 'consultant', 'intern']),
        match: (row, value) => row.employment_type === value,
      },
    ]}
    fields={[
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'staff_no', label: 'Staff number', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'gender', label: 'Gender', type: 'select', options: asOptions(['female', 'male', 'other']) },
      { name: 'position', label: 'Position', type: 'text', required: true },
      {
        name: 'employment_type',
        label: 'Employment type',
        type: 'select',
        defaultValue: 'full_time',
        options: asOptions(['full_time', 'part_time', 'contract', 'consultant', 'intern']),
      },
      { name: 'hire_date', label: 'Hire date', type: 'date', required: true },
      { name: 'exit_date', label: 'Exit date', type: 'date' },
      { name: 'duty_station', label: 'Duty station', type: 'text' },
      { name: 'gross_salary_minor', label: 'Gross salary', type: 'money' },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'active',
        options: asOptions(['active', 'on_leave', 'suspended', 'exited']),
      },
    ]}
    kpis={(rows, currency) => [
      { label: 'Staff', value: formatNumber(rows.length), icon: Briefcase, hint: `${rows.filter((r) => r.status === 'active').length} active` },
      {
        label: 'Monthly payroll',
        value: formatCompactCurrency(sum(rows.filter((r) => r.status !== 'exited'), (r) => r.gross_salary_minor), currency),
        icon: Wallet,
      },
      {
        label: 'Female representation',
        value: `${rows.length ? Math.round((rows.filter((r) => r.gender === 'female').length / rows.length) * 100) : 0}%`,
        icon: UsersRound,
      },
      { label: 'Duty stations', value: formatNumber(new Set(rows.map((r) => r.duty_station).filter(Boolean)).size), icon: Compass },
    ]}
    charts={(rows) => (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Headcount by employment type" subtitle="Workforce composition">
          <DonutChart
            data={Object.entries(groupBy(rows, (row) => titleCase(row.employment_type))).map(([name, list]) => ({
              name,
              value: list.length,
            }))}
          />
        </ChartCard>
        <ChartCard title="Headcount by duty station" subtitle="Geographic distribution of staff">
          <ComparisonBars
            data={Object.entries(groupBy(rows.filter((r) => r.duty_station), (row) => row.duty_station as string)).map(
              ([name, list]) => ({ name, value: list.length }),
            )}
            series={[{ key: 'value', label: 'Staff' }]}
            layout="vertical"
          />
        </ChartCard>
      </div>
    )}
    aiContext={(rows, currency) =>
      [
        `Staff: ${rows.length} on the register, ${rows.filter((r) => r.status === 'active').length} active. Monthly payroll ${formatCurrency(sum(rows, (r) => r.gross_salary_minor), currency)}.`,
        ...rows
          .slice(0, 80)
          .map((row) => `${row.full_name} (${row.staff_no}) — ${row.position}, ${row.employment_type}, ${row.duty_station ?? 'unassigned'}, status ${row.status}.`),
      ].join('\n')
    }
  />
)

export const ORGANIZATION_TYPE_OPTIONS = asOptions(ORGANIZATION_TYPES)
