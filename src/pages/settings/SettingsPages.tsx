import { useMemo, useState, type FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Building2,
  Check,
  Database,
  FileClock,
  Info,
  Key,
  Languages,
  Loader2,
  MessageSquare,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Trash2,
  User,
  Users,
  Webhook,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import {
  Badge,
  FormCard,
  FormField,
  FormRow,
  KPICard,
  KPICardGrid,
  NegoModal,
  PageHeader,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { useCollection, useDemoData } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { useAppStore, DEFAULT_FEATURE_FLAGS } from '@/stores/app.store'
import { organizationService, isEvaluationMode } from '@/lib/services/auth.service'
import { DEMO_SCENARIOS, CURRENCIES, ORGANIZATION_TYPES, ROLE_LABELS, APP_VERSION, SCHEMA_VERSION, BRAND, PRODUCT, AI_BRAND, RELEASE_DATE, ENTERPRISE_STANDARD, env, type DemoScenarioId } from '@/constants'
import { SCENARIO_SHAPES } from '@/lib/demoData'
import { formatBytes, formatDate, formatNumber, timeAgo, titleCase } from '@/lib/utils'
import type { AppUser, AuditLog, JobRun, MessageLog, Organization } from '@/types'

/* -------------------------------------------------------- Settings hub */

const SETTINGS_LINKS = [
  { href: '/app/settings/organization', label: 'Organization', description: 'Legal identity, contact details, currency and financial year', icon: Building2 },
  { href: '/app/settings/users', label: 'Users & Roles', description: 'Team members, role assignment and access levels', icon: Users },
  { href: '/app/settings/ai', label: 'AI Platform', description: 'Provider, model routing, limits and module toggles', icon: Sparkles },
  { href: '/app/settings/communication', label: 'Communication', description: 'Email, SMS and WhatsApp providers and templates', icon: MessageSquare },
  { href: '/app/settings/features', label: 'Feature Management', description: 'Enable or disable modules and beta capabilities', icon: ToggleLeft },
  { href: '/app/settings/demo', label: 'Demo Data', description: 'Load or remove realistic sample data for demonstrations', icon: Database },
  { href: '/app/settings/audit', label: 'Audit Trail', description: 'Immutable record of every change made in the system', icon: FileClock },
  { href: '/app/settings/api', label: 'API & Webhooks', description: 'Programmatic access keys and outbound event delivery', icon: Webhook },
  { href: '/app/settings/system', label: 'System Health', description: 'Version, background jobs, storage and diagnostics', icon: Activity },
  { href: '/app/settings/profile', label: 'My Profile', description: 'Your personal details, password and preferences', icon: User },
  { href: '/app/settings/about', label: 'About', description: 'Product version, licence and support information', icon: Info },
]

export const SettingsHubPage: FC = () => (
  <AppShell aiModule="settings" aiContext="Settings and administration area.">
    <PageHeader
      title="Settings"
      subtitle="Configure the platform for your organization"
      icon={Palette}
      breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Settings' }]}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SETTINGS_LINKS.map((link) => (
        <Link key={link.href} to={link.href} className="nl-card p-5 transition-transform hover:-translate-y-1">
          <span
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
          >
            <link.icon size={18} />
          </span>
          <h3 className="font-display text-sm font-bold text-ink">{link.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{link.description}</p>
        </Link>
      ))}
    </div>
  </AppShell>
)

/* ------------------------------------------------------- Organization */

export const OrganizationSettingsPage: FC = () => {
  const organization = useAppStore((state) => state.organization)
  const setOrganization = useAppStore((state) => state.setOrganization)
  const [form, setForm] = useState<Partial<Organization>>(organization ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (key: keyof Organization, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const save = async (): Promise<void> => {
    if (!organization) return
    setSaving(true)
    try {
      const updated = await organizationService.update(organization.id, form)
      setOrganization(updated)
      setSaved(true)
      toast.success('Organization details saved')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell aiModule="settings" aiContext={`Organization: ${organization?.name}`}>
      <PageHeader
        title="Organization"
        subtitle="Legal identity, contact details and financial configuration"
        icon={Building2}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Organization' }]}
        actions={
          <>
            {saved ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <Check size={14} /> Saved
              </span>
            ) : null}
            <button type="button" className="nl-btn nl-btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
            </button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <FormCard title="Identity" description="How your organization appears on documents and reports">
          <FormRow>
            <FormField label="Display name" required className="sm:col-span-2">
              <input className="nl-input" value={form.name ?? ''} onChange={(event) => set('name', event.target.value)} />
            </FormField>
            <FormField label="Registered legal name" className="sm:col-span-2">
              <input className="nl-input" value={form.legal_name ?? ''} onChange={(event) => set('legal_name', event.target.value)} />
            </FormField>
            <FormField label="Organization type">
              <select className="nl-input" value={form.org_type ?? ''} onChange={(event) => set('org_type', event.target.value)}>
                {ORGANIZATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Registration number">
              <input className="nl-input" value={form.registration_number ?? ''} onChange={(event) => set('registration_number', event.target.value)} />
            </FormField>
            <FormField label="Tax identification number">
              <input className="nl-input" value={form.tax_id ?? ''} onChange={(event) => set('tax_id', event.target.value)} />
            </FormField>
            <FormField label="Website">
              <input className="nl-input" value={form.website ?? ''} onChange={(event) => set('website', event.target.value)} />
            </FormField>
          </FormRow>
        </FormCard>

        <FormCard title="Contact" description="Used in document letterheads and donor correspondence">
          <FormRow>
            <FormField label="Email">
              <input className="nl-input" type="email" value={form.email ?? ''} onChange={(event) => set('email', event.target.value)} />
            </FormField>
            <FormField label="Phone">
              <input className="nl-input" value={form.phone ?? ''} onChange={(event) => set('phone', event.target.value)} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <textarea className="nl-input min-h-[80px] resize-y" value={form.address ?? ''} onChange={(event) => set('address', event.target.value)} />
            </FormField>
            <FormField label="City">
              <input className="nl-input" value={form.city ?? ''} onChange={(event) => set('city', event.target.value)} />
            </FormField>
            <FormField label="State / Region">
              <input className="nl-input" value={form.state ?? ''} onChange={(event) => set('state', event.target.value)} />
            </FormField>
            <FormField label="Country" className="sm:col-span-2">
              <input className="nl-input" value={form.country ?? ''} onChange={(event) => set('country', event.target.value)} />
            </FormField>
          </FormRow>
        </FormCard>

        <FormCard title="Finance & locale" description="Applies across reporting, exports and formatting">
          <FormRow>
            <FormField label="Base currency">
              <select className="nl-input" value={form.base_currency ?? 'NGN'} onChange={(event) => set('base_currency', event.target.value)}>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Financial year start" hint="Format MM-DD">
              <input className="nl-input" value={form.financial_year_start ?? '01-01'} onChange={(event) => set('financial_year_start', event.target.value)} />
            </FormField>
            <FormField label="Timezone">
              <input className="nl-input" value={form.timezone ?? ''} onChange={(event) => set('timezone', event.target.value)} />
            </FormField>
            <FormField label="Date format">
              <select className="nl-input" value={form.date_format ?? 'dd MMM yyyy'} onChange={(event) => set('date_format', event.target.value)}>
                <option value="dd MMM yyyy">31 Dec 2026</option>
                <option value="dd/MM/yyyy">31/12/2026</option>
                <option value="MM/dd/yyyy">12/31/2026</option>
                <option value="yyyy-MM-dd">2026-12-31</option>
              </select>
            </FormField>
          </FormRow>
        </FormCard>

        <FormCard title="Mission & vision" description="Included in generated reports and the organizational profile">
          <FormField label="Mission statement" className="mb-4">
            <textarea className="nl-input min-h-[90px] resize-y" value={form.mission ?? ''} onChange={(event) => set('mission', event.target.value)} />
          </FormField>
          <FormField label="Vision statement">
            <textarea className="nl-input min-h-[90px] resize-y" value={form.vision ?? ''} onChange={(event) => set('vision', event.target.value)} />
          </FormField>
        </FormCard>
      </div>
    </AppShell>
  )
}

/* --------------------------------------------------------------- Users */

export const UsersSettingsPage: FC = () => {
  const { data: users = [], isLoading } = useCollection<AppUser>(TABLES.users)

  return (
    <AppShell aiModule="settings" aiContext={`Users: ${users.length} accounts.`}>
      <PageHeader
        title="Users & Roles"
        subtitle="Team members, their roles and access levels"
        icon={Users}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Users' }]}
      />

      {isEvaluationMode ? (
        <div
          className="mb-5 rounded-xl p-4 text-xs leading-relaxed text-ink-2"
          style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-border)' }}
        >
          <strong className="text-ink">Evaluation mode.</strong> User management requires a connected Supabase
          project. Add your credentials to <code>.env</code> and invite team members from the Supabase dashboard;
          they will appear here on first sign-in.
        </div>
      ) : null}

      <DataTable<AppUser>
        data={users}
        loading={isLoading}
        exportName="users"
        exportTitle="User Accounts"
        columns={[
          { key: 'full_name', header: 'Name', render: (row) => <span className="font-semibold text-ink">{row.full_name}</span> },
          { key: 'email', header: 'Email' },
          { key: 'job_title', header: 'Job title' },
          { key: 'role', header: 'Role', render: (row) => <Badge tone="accent">{ROLE_LABELS[row.role] ?? row.role}</Badge> },
          { key: 'last_login_at', header: 'Last sign-in', render: (row) => (row.last_login_at ? timeAgo(row.last_login_at) : 'Never') },
          {
            key: 'mfa_enabled',
            header: 'MFA',
            render: (row) => <Badge tone={row.mfa_enabled ? 'success' : 'neutral'}>{row.mfa_enabled ? 'Enabled' : 'Off'}</Badge>,
          },
          {
            key: 'is_active',
            header: 'Status',
            render: (row) => <Badge tone={row.is_active ? 'success' : 'danger'}>{row.is_active ? 'Active' : 'Deactivated'}</Badge>,
          },
        ]}
        filters={[
          {
            key: 'role',
            label: 'Role',
            options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
            match: (row, value) => row.role === value,
          },
        ]}
      />
    </AppShell>
  )
}

/* ---------------------------------------------------------- AI platform */

export const AISettingsPage: FC = () => {
  const featureFlags = useAppStore((state) => state.featureFlags)
  const setFeatureFlag = useAppStore((state) => state.setFeatureFlag)
  const [model, setModel] = useState('llama-3.3-70b-versatile')
  const [temperature, setTemperature] = useState(0.4)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [monthlyLimit, setMonthlyLimit] = useState(5000)

  const aiFlags = Object.entries(featureFlags).filter(([key]) => key.startsWith('ai_'))

  return (
    <AppShell aiModule="settings" aiContext="AI platform configuration.">
      <PageHeader
        title="AI Platform"
        subtitle={`Configure ${AI_BRAND.platform} for your organization`}
        icon={Sparkles}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'AI Platform' }]}
      />

      <div
        className="mb-5 flex items-start gap-3 rounded-xl p-4"
        style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-border)' }}
      >
        <ShieldCheck size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
        <p className="text-xs leading-relaxed text-ink-2">
          <strong className="text-ink">Your API key never reaches the browser.</strong> Keys are stored encrypted
          on the server and used only by the AI gateway function. Set{' '}
          <code className="rounded bg-card-alt px-1">AI_API_KEY</code> in your Supabase Edge Function secrets to
          activate generative features.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FormCard title="Model configuration" description="Applies to every AI request made by this organization">
          <FormRow>
            <FormField label="Default model" className="sm:col-span-2" hint="Fast general-purpose model used for chat and insights">
              <input className="nl-input" value={model} onChange={(event) => setModel(event.target.value)} />
            </FormField>
            <FormField label="Temperature" hint="Lower is more factual, higher is more creative">
              <input
                className="nl-input"
                type="number"
                step="0.1"
                min={0}
                max={1}
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
            </FormField>
            <FormField label="Maximum tokens">
              <input className="nl-input" type="number" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} />
            </FormField>
            <FormField label="Monthly request limit" className="sm:col-span-2">
              <input
                className="nl-input"
                type="number"
                value={monthlyLimit}
                onChange={(event) => setMonthlyLimit(Number(event.target.value))}
              />
            </FormField>
          </FormRow>
        </FormCard>

        <FormCard title="Model routing" description="Different tasks are routed to the most suitable model automatically">
          <ul className="space-y-3">
            {[
              ['Chat and assistance', 'Fast conversational model'],
              ['Document generation', 'Long-context writing model'],
              ['Analysis and insight', 'Reasoning-optimised model'],
              ['Summarization', 'Efficient short-form model'],
              ['Complex reasoning', 'Highest capability model'],
            ].map(([task, description]) => (
              <li key={task} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-ink">{task}</p>
                  <p className="text-[11px] text-ink-3">{description}</p>
                </div>
                <Badge tone="accent">Automatic</Badge>
              </li>
            ))}
          </ul>
        </FormCard>

        <FormCard title="AI capabilities" description="Switch individual AI features on or off across the platform" className="lg:col-span-2">
          <ul className="grid gap-3 sm:grid-cols-2">
            {aiFlags.map(([key, enabled]) => (
              <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{titleCase(key.replace('ai_', '').replace(/_/g, ' '))}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setFeatureFlag(key, !enabled)}
                  className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                  style={{ background: enabled ? 'var(--accent-primary)' : 'var(--bg-border)' }}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                    style={{ left: enabled ? 22 : 2 }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </FormCard>
      </div>
    </AppShell>
  )
}

/* ------------------------------------------------- Feature management */

export const FeatureSettingsPage: FC = () => {
  const featureFlags = useAppStore((state) => state.featureFlags)
  const setFeatureFlag = useAppStore((state) => state.setFeatureFlag)

  const groups: Record<string, string> = {
    module_: 'Modules',
    ai_: 'AI capabilities',
    beta_: 'Beta features',
    integration_: 'Integrations',
    future_: 'Coming soon',
  }

  return (
    <AppShell aiModule="settings" aiContext="Feature management.">
      <PageHeader
        title="Feature Management"
        subtitle="Enable only the modules your organization needs"
        icon={ToggleLeft}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Features' }]}
      />

      <div className="space-y-5">
        {Object.entries(groups).map(([prefix, label]) => {
          const flags = Object.keys(DEFAULT_FEATURE_FLAGS).filter((key) => key.startsWith(prefix))
          if (!flags.length) return null
          return (
            <FormCard key={prefix} title={label}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {flags.map((key) => {
                  const enabled = featureFlags[key] ?? false
                  const isFuture = prefix === 'future_'
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {titleCase(key.replace(prefix, '').replace(/_/g, ' '))}
                        </p>
                        {isFuture ? <p className="text-[11px] text-ink-3">Planned for a future release</p> : null}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={isFuture}
                        onClick={() => setFeatureFlag(key, !enabled)}
                        className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40"
                        style={{ background: enabled ? 'var(--accent-primary)' : 'var(--bg-border)' }}
                      >
                        <span
                          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                          style={{ left: enabled ? 22 : 2 }}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </FormCard>
          )
        })}
      </div>
    </AppShell>
  )
}

/* --------------------------------------------------- Demo Data Manager */

export const DemoDataPage: FC = () => {
  const demoMode = useAppStore((state) => state.demoMode)
  const { load, remove } = useDemoData()
  const [scenario, setScenario] = useState<DemoScenarioId>('medium')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const shape = SCENARIO_SHAPES[scenario]

  return (
    <AppShell aiModule="settings" aiContext="Demo data manager.">
      <PageHeader
        title="Demo Data"
        subtitle="Load realistic sample data to explore or demonstrate every module"
        icon={Database}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Demo Data' }]}
      />

      {demoMode ? (
        <div
          className="mb-5 flex items-center gap-3 rounded-xl p-4"
          style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-border)' }}
        >
          <Zap size={17} style={{ color: 'var(--accent-primary)' }} />
          <p className="text-xs text-ink-2">
            <strong className="text-ink">Demo mode is active.</strong> Sample records are marked separately from
            your real data and can be removed at any time without affecting anything you have created.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <FormCard title="Choose a scenario" description="Each scenario generates a complete, interconnected organization" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className="rounded-xl border p-4 text-left transition-all"
                style={{
                  borderColor: scenario === item.id ? 'var(--accent-primary)' : 'var(--bg-border)',
                  background: scenario === item.id ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-1 text-xs text-ink-2">{item.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-line p-4">
            <p className="nl-section-title mb-3">This scenario generates approximately</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Projects', shape.projects],
                ['Programmes', shape.programs],
                ['Donors', shape.donors],
                ['Grants', shape.grants],
                ['Beneficiaries', shape.beneficiaries],
                ['Staff', shape.employees],
                ['Volunteers', shape.volunteers],
                ['Transactions', shape.transactions],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-3">{label}</dt>
                  <dd className="nl-accent-text font-display text-lg font-bold">{formatNumber(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              Records are fully interconnected: donors fund grants, grants fund projects, beneficiaries enrol in
              projects, indicators measure delivery, and transactions draw down budget lines. Every load produces
              different names, figures and dates.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="nl-btn nl-btn-primary"
              onClick={() => load.mutate(scenario)}
              disabled={load.isPending || remove.isPending}
            >
              {load.isPending ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {load.isPending ? 'Generating…' : demoMode ? 'Reload demo data' : 'Load demo data'}
            </button>
            {demoMode ? (
              <button
                type="button"
                className="nl-btn nl-btn-danger"
                onClick={() => setConfirmDelete(true)}
                disabled={load.isPending || remove.isPending}
              >
                <Trash2 size={15} /> Delete demo data
              </button>
            ) : null}
          </div>
        </FormCard>

        <FormCard title="How it works" description="Safety guarantees">
          <ul className="space-y-4 text-xs leading-relaxed text-ink-2">
            {[
              ['Real data is never touched', 'Demo records carry a separate marker. Deleting demo data removes only records with that marker.'],
              ['Different every time', 'Organization name, donors, projects, figures and dates are regenerated on each load.'],
              ['Every module populated', 'Programmes, grants, beneficiaries, MEL, finance, procurement, fleet, governance and documents.'],
              ['Reload to reset', 'Loading again clears the previous demo footprint first, so records never accumulate.'],
            ].map(([title, body]) => (
              <li key={title}>
                <p className="mb-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Check size={13} style={{ color: 'var(--accent-primary)' }} /> {title}
                </p>
                <p className="pl-5">{body}</p>
              </li>
            ))}
          </ul>
        </FormCard>
      </div>

      <NegoModal
        title="Delete all demo data?"
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        destructive
        footer={
          <>
            <button type="button" className="nl-btn nl-btn-subtle" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="nl-btn nl-btn-danger"
              onClick={() => {
                remove.mutate(undefined, { onSuccess: () => setConfirmDelete(false) })
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete demo data
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Every record created by the demo generator will be permanently removed. Any data your team has entered
          is untouched and remains exactly as it is.
        </p>
      </NegoModal>
    </AppShell>
  )
}

/* --------------------------------------------------------- Audit trail */

export const AuditPage: FC = () => {
  const { data: logs = [], isLoading } = useCollection<AuditLog>(TABLES.auditLogs, { orderBy: 'created_at', limit: 500 })

  return (
    <AppShell aiModule="settings" aiContext={`Audit trail: ${logs.length} entries.`}>
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable record of every create, update and delete in the system"
        icon={FileClock}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Audit Trail' }]}
      />

      <DataTable<AuditLog>
        data={logs}
        loading={isLoading}
        exportName="audit-trail"
        exportTitle="Audit Trail"
        columns={[
          { key: 'created_at', header: 'When', render: (row) => formatDate(row.created_at, true) },
          { key: 'user_name', header: 'User', render: (row) => <span className="font-semibold text-ink">{row.user_name}</span> },
          { key: 'user_role', header: 'Role', render: (row) => ROLE_LABELS[row.user_role as keyof typeof ROLE_LABELS] ?? row.user_role },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <Badge tone={row.action === 'DELETE' ? 'danger' : row.action === 'CREATE' ? 'success' : 'accent'}>
                {row.action}
              </Badge>
            ),
          },
          { key: 'module', header: 'Module' },
          { key: 'record_label', header: 'Record', hideOnMobile: true },
        ]}
        filters={[
          {
            key: 'action',
            label: 'Action',
            options: ['CREATE', 'UPDATE', 'DELETE'].map((value) => ({ value, label: value })),
            match: (row, value) => row.action === value,
          },
        ]}
      />
    </AppShell>
  )
}

/* ------------------------------------------------------ Communication */

export const CommunicationSettingsPage: FC = () => {
  const { data: messages = [], isLoading } = useCollection<MessageLog>(TABLES.messages)
  const [tab, setTab] = useState('providers')

  const providers = [
    { channel: 'Email', options: ['SMTP', 'Gmail', 'Microsoft 365', 'EmailJS'], icon: MessageSquare },
    { channel: 'SMS', options: ['Termii', 'SmartSMSSolutions', "Africa's Talking", 'Twilio'], icon: MessageSquare },
    { channel: 'WhatsApp', options: ['WhatsApp Business API', 'Meta Cloud API'], icon: MessageSquare },
  ]

  return (
    <AppShell aiModule="settings" aiContext="Communication settings.">
      <PageHeader
        title="Communication"
        subtitle="Email, SMS and WhatsApp providers, templates and delivery logs"
        icon={MessageSquare}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Communication' }]}
      />

      <TabBar
        tabs={[
          { key: 'providers', label: 'Providers' },
          { key: 'logs', label: 'Delivery log', count: messages.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'providers' ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {providers.map((provider) => (
            <FormCard key={provider.channel} title={provider.channel} description="Select and configure a provider">
              <FormField label="Provider" className="mb-4">
                <select className="nl-input">
                  {provider.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <p className="rounded-lg p-3 text-[11px] leading-relaxed text-ink-3" style={{ background: 'var(--bg-card-alt)' }}>
                Credentials are stored as encrypted Edge Function secrets, never in the browser. Set them in your
                Supabase project under Settings → Edge Functions → Secrets.
              </p>
            </FormCard>
          ))}
        </div>
      ) : (
        <DataTable<MessageLog>
          data={messages}
          loading={isLoading}
          exportName="message-log"
          exportTitle="Message Delivery Log"
          columns={[
            { key: 'created_at', header: 'When', render: (row) => formatDate(row.created_at, true) },
            { key: 'channel', header: 'Channel', render: (row) => <Badge tone="accent">{titleCase(row.channel)}</Badge> },
            { key: 'recipient', header: 'Recipient' },
            { key: 'subject', header: 'Subject' },
            { key: 'provider', header: 'Provider', hideOnMobile: true },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
        />
      )}
    </AppShell>
  )
}

/* ------------------------------------------------------- API/Webhooks */

export const ApiSettingsPage: FC = () => (
  <AppShell aiModule="settings" aiContext="API and webhook settings.">
    <PageHeader
      title="API & Webhooks"
      subtitle="Programmatic access and outbound event delivery"
      icon={Webhook}
      breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'API' }]}
    />

    <div className="grid gap-5 lg:grid-cols-2">
      <FormCard title="REST API" description="Read and write your organization's data programmatically">
        <p className="mb-3 text-xs leading-relaxed text-ink-2">
          The public API is served by the <code className="rounded bg-card-alt px-1">api</code> Edge Function at:
        </p>
        <pre className="overflow-x-auto rounded-lg p-3 font-mono text-[11px] text-ink-2" style={{ background: 'var(--bg-card-alt)' }}>
{`GET  /api/v1/projects
GET  /api/v1/grants
GET  /api/v1/donors
GET  /api/v1/beneficiaries
GET  /api/v1/indicators
POST /api/v1/field-visits`}
        </pre>
        <p className="mt-3 text-xs leading-relaxed text-ink-2">
          Authenticate with the <code className="rounded bg-card-alt px-1">X-API-Key</code> header. Keys carry
          scopes and a per-hour rate limit, and every call is written to the audit trail.
        </p>
      </FormCard>

      <FormCard title="Webhooks" description="Receive events when records change">
        <ul className="space-y-2 text-xs text-ink-2">
          {[
            'project.created', 'project.status_changed', 'grant.awarded', 'grant.report_due',
            'donation.received', 'beneficiary.registered', 'approval.requested', 'approval.decided',
          ].map((event) => (
            <li key={event} className="flex items-center gap-2 border-b border-line pb-1.5 last:border-0">
              <Key size={12} style={{ color: 'var(--accent-primary)' }} />
              <code className="font-mono">{event}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
          Deliveries are signed with an HMAC signature and retried with exponential backoff on failure.
        </p>
      </FormCard>
    </div>
  </AppShell>
)

/* ------------------------------------------------------- System health */

export const SystemPage: FC = () => {
  const { data: jobs = [], isLoading } = useCollection<JobRun>(TABLES.jobRuns)
  const organization = useAppStore((state) => state.organization)

  const stats = useMemo(
    () => ({
      successRate: jobs.length ? Math.round((jobs.filter((j) => j.status === 'success').length / jobs.length) * 100) : 100,
      lastRun: jobs[0]?.ran_at,
    }),
    [jobs],
  )

  return (
    <AppShell aiModule="settings" aiContext="System health.">
      <PageHeader
        title="System Health"
        subtitle="Version, background jobs and platform diagnostics"
        icon={Activity}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'System' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Application version" value={`v${APP_VERSION}`} icon={Info} hint={`Schema ${SCHEMA_VERSION}`} />
        <KPICard
          title="Backend"
          value={isEvaluationMode ? 'Evaluation' : 'Connected'}
          icon={Database}
          hint={isEvaluationMode ? 'No Supabase project attached' : 'Supabase online'}
        />
        <KPICard title="Job success rate" value={`${stats.successRate}%`} icon={Activity} hint={stats.lastRun ? `Last run ${timeAgo(stats.lastRun)}` : 'No jobs yet'} />
        <KPICard title="Organization" value={organization?.name ?? '—'} icon={Building2} hint={organization?.country ?? ''} />
      </KPICardGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <FormCard title="Scheduled jobs" description="Background tasks that keep alerts and reports current">
          <ul className="space-y-3">
            {[
              ['Grant expiry alerts', 'Daily at 06:00'],
              ['Donor report reminders', 'Daily at 06:15'],
              ['Compliance calendar check', 'Daily at 06:30'],
              ['Budget variance analysis', 'Weekly on Monday'],
              ['Indicator collection reminders', 'Monthly'],
              ['Database backup', 'Daily at 02:00'],
            ].map(([job, schedule]) => (
              <li key={job} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-ink">{job}</p>
                  <p className="text-[11px] text-ink-3">{schedule}</p>
                </div>
                <Badge tone="success">Scheduled</Badge>
              </li>
            ))}
          </ul>
        </FormCard>

        <FormCard title="Recent job runs">
          {isLoading ? (
            <div className="nl-skeleton h-40" />
          ) : jobs.length ? (
            <ul className="space-y-2.5">
              {jobs.slice(0, 10).map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{titleCase(job.job_key.replace(/_/g, ' '))}</p>
                    <p className="truncate text-[11px] text-ink-3">{job.message}</p>
                  </div>
                  <Badge tone={statusTone(job.status)}>{titleCase(job.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-xs text-ink-3">No job runs recorded yet.</p>
          )}
        </FormCard>
      </div>
    </AppShell>
  )
}

/* ------------------------------------------------------------- Profile */

export const ProfilePage: FC = () => {
  const session = useAppStore((state) => state.session)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  return (
    <AppShell aiModule="settings" aiContext="User profile.">
      <PageHeader
        title="My Profile"
        subtitle="Your details and personal preferences"
        icon={User}
        breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'Profile' }]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <FormCard title="Account" description="Managed by your organization administrator">
          <dl className="space-y-3">
            {[
              ['Full name', session?.fullName ?? '—'],
              ['Email address', session?.email ?? '—'],
              ['Job title', session?.jobTitle ?? '—'],
              ['Role', session ? ROLE_LABELS[session.role] : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-line pb-2.5 last:border-0">
                <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
                <dd className="text-sm text-ink-2">{value}</dd>
              </div>
            ))}
          </dl>
        </FormCard>

        <FormCard title="Appearance" description="Applies to your account on this device">
          <FormField label="Theme" className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              {(['dark', 'light'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className="rounded-xl border p-4 text-left transition-all"
                  style={{
                    borderColor: theme === option ? 'var(--accent-primary)' : 'var(--bg-border)',
                    background: theme === option ? 'var(--accent-glow)' : 'transparent',
                  }}
                >
                  <p className="text-sm font-bold text-ink">{titleCase(option)} mode</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">
                    {option === 'dark' ? 'Default enterprise appearance' : 'Higher contrast for bright rooms'}
                  </p>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Language" hint="Additional languages are supplied with the platform">
            <select className="nl-input">
              <option>English</option>
              <option>Français</option>
              <option>العربية</option>
              <option>Português</option>
            </select>
          </FormField>
        </FormCard>
      </div>
    </AppShell>
  )
}

/* --------------------------------------------------------------- About */

export const AboutPage: FC = () => (
  <AppShell aiModule="settings" aiContext="About this product.">
    <PageHeader
      title="About"
      subtitle="Product, version and support information"
      icon={Info}
      breadcrumb={[{ label: 'Settings', href: '/app/settings' }, { label: 'About' }]}
    />

    <div className="grid gap-5 lg:grid-cols-2">
      <FormCard title={PRODUCT.name}>
        <dl className="space-y-3">
          {[
            ['Version', `v${APP_VERSION}`],
            ['Schema version', SCHEMA_VERSION],
            ['Released', RELEASE_DATE],
            ['Standard', ENTERPRISE_STANDARD],
            ['Suite', BRAND.suite],
            ['Deployment', PRODUCT.url],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-line pb-2.5 last:border-0">
              <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
              <dd className="text-sm text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
      </FormCard>

      <FormCard title="Support & licence">
        <p className="text-sm leading-relaxed text-ink-2">
          This software is licensed to your organization by {BRAND.legalName}. All rights reserved.
        </p>
        <dl className="mt-4 space-y-3">
          {[
            ['Support email', env.supportEmail],
            ['Support phone', env.supportPhone],
            ['Website', 'negolinks.com'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-line pb-2.5 last:border-0">
              <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
              <dd className="text-sm text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
        <a href={BRAND.website} target="_blank" rel="noreferrer" className="nl-btn nl-btn-ghost mt-5 w-full">
          <Languages size={15} /> Visit negolinks.com
        </a>
      </FormCard>
    </div>

    <p className="mt-6 text-center text-xs text-ink-3">
      Storage in use: {formatBytes(0)} · Powered by {BRAND.suite}
    </p>
  </AppShell>
)
