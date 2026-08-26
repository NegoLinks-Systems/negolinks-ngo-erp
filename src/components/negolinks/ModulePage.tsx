import { useMemo, useState, type FC, type ReactNode } from 'react'
import { Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable, type Column, type FilterDef } from '@/components/negolinks/DataTable'
import { KPICard, KPICardGrid, NegoModal, PageHeader } from '@/components/negolinks/Primitives'
import { RecordForm, type FieldDef, type FormValues } from '@/components/negolinks/RecordForm'
import { useCollection, useCreateRecord, useDeleteRecord, useUpdateRecord } from '@/hooks/useData'
import { useAppStore } from '@/stores/app.store'
import { toMinor } from '@/lib/utils'
import type { KPIStat } from '@/types'

export interface ModulePageProps<T> {
  title: string
  subtitle: string
  icon: LucideIcon
  aiModule: string
  table: string
  recordLabel: string
  columns: Column<T>[]
  fields: FieldDef[]
  filters?: FilterDef<T>[]
  /** Fields stored as minor units — the form works in major units. */
  moneyFields?: string[]
  kpis?: (rows: T[], currency: string) => (KPIStat & { icon: LucideIcon })[]
  aiContext?: (rows: T[], currency: string) => string
  charts?: (rows: T[], currency: string) => ReactNode
  extra?: (rows: T[]) => ReactNode
  toFormValues?: (row: T) => FormValues
  beforeSave?: (values: FormValues) => Record<string, unknown>
  exportName?: string
  searchFields?: (row: T) => string
  readOnly?: boolean
}

export const ModulePage = <T extends { id: string },>({
  title,
  subtitle,
  icon,
  aiModule,
  table,
  recordLabel,
  columns,
  fields,
  filters,
  moneyFields = [],
  kpis,
  aiContext,
  charts,
  extra,
  toFormValues,
  beforeSave,
  exportName,
  searchFields,
  readOnly,
}: ModulePageProps<T>) => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const can = useAppStore((state) => state.can)
  const { data: rows = [], isLoading } = useCollection<T>(table)
  const create = useCreateRecord<Record<string, unknown>>(table, recordLabel)
  const update = useUpdateRecord<Record<string, unknown>>(table, recordLabel)
  const remove = useDeleteRecord(table, recordLabel)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)

  const stats = useMemo(() => kpis?.(rows, currency) ?? [], [kpis, rows, currency])
  const context = useMemo(
    () => aiContext?.(rows, currency) ?? `${title}: ${rows.length} record(s) on file.`,
    [aiContext, rows, currency, title],
  )

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!editing) return undefined
    if (toFormValues) return toFormValues(editing)
    const values: FormValues = {}
    fields.forEach((field) => {
      const raw = (editing as unknown as Record<string, unknown>)[field.name]
      if (moneyFields.includes(field.name)) {
        values[field.name] = typeof raw === 'number' ? raw / 100 : 0
      } else if (Array.isArray(raw)) {
        values[field.name] = raw as string[]
      } else if (typeof raw === 'boolean' || typeof raw === 'number') {
        values[field.name] = raw
      } else {
        values[field.name] = raw == null ? '' : String(raw)
      }
    })
    return values
  }, [editing, fields, moneyFields, toFormValues])

  const handleSubmit = (values: FormValues): void => {
    const payload: Record<string, unknown> = beforeSave ? beforeSave(values) : { ...values }
    moneyFields.forEach((field) => {
      const value = payload[field]
      if (typeof value === 'number') payload[field] = toMinor(value)
      if (value === '') payload[field] = 0
    })
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null
    })

    if (editing) {
      update.mutate({ id: editing.id, changes: payload }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  const canWrite = !readOnly && can('create')

  return (
    <AppShell aiModule={aiModule} aiContext={context}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: title }]}
        actions={
          canWrite ? (
            <button
              type="button"
              className="nl-btn nl-btn-primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus size={15} /> New {recordLabel}
            </button>
          ) : null
        }
      />

      {stats.length ? (
        <KPICardGrid className="mb-5">
          {stats.map((stat) => (
            <KPICard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              icon={stat.icon}
              hint={stat.hint}
              trend={stat.trend}
              trendUp={stat.trendUp}
              loading={isLoading}
            />
          ))}
        </KPICardGrid>
      ) : null}

      {charts ? <div className="mb-5">{charts(rows, currency)}</div> : null}
      {extra ? <div className="mb-5">{extra(rows)}</div> : null}

      <DataTable<T>
        data={rows}
        columns={columns}
        loading={isLoading}
        filters={filters}
        exportName={exportName ?? aiModule}
        exportTitle={title}
        searchFields={searchFields}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription={
          canWrite
            ? `Create your first ${recordLabel.toLowerCase()}, or load demo data from Settings to explore this module.`
            : `Records will appear here once they are created.`
        }
        actions={
          canWrite
            ? (row) => (
                <>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-alt hover:text-accent-light"
                    onClick={() => {
                      setEditing(row)
                      setFormOpen(true)
                    }}
                    aria-label={`Edit ${recordLabel}`}
                  >
                    <Pencil size={14} />
                  </button>
                  {can('delete') ? (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-alt hover:text-danger"
                      onClick={() => setDeleting(row)}
                      aria-label={`Delete ${recordLabel}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </>
              )
            : undefined
        }
      />

      <RecordForm
        title={editing ? `Edit ${recordLabel}` : `New ${recordLabel}`}
        description={editing ? 'Update the details below.' : `Add a new ${recordLabel.toLowerCase()} to your organization.`}
        fields={fields}
        initial={initialValues}
        isOpen={formOpen}
        submitting={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save changes' : `Create ${recordLabel}`}
      />

      <NegoModal
        title={`Delete ${recordLabel.toLowerCase()}?`}
        description="The record is archived and removed from active lists. Your audit trail keeps a permanent history."
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        destructive
        footer={
          <>
            <button type="button" className="nl-btn nl-btn-subtle" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="nl-btn nl-btn-danger"
              onClick={() => {
                if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
              }}
              disabled={remove.isPending}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          This action removes the record from every active view. It can be restored by an administrator from
          the audit trail if required.
        </p>
      </NegoModal>
    </AppShell>
  )
}

export const ModulePageWrapper: FC<{ children: ReactNode }> = ({ children }) => <>{children}</>
