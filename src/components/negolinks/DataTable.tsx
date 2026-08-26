import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Search,
} from 'lucide-react'
import { cn, debounce } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, SEARCH_DEBOUNCE_MS } from '@/constants'
import { EmptyState, TableSkeleton } from '@/components/negolinks/Primitives'
import { downloadCsv, downloadJson, downloadPdf, downloadXlsx, makeVerificationCode } from '@/lib/documents'
import { useAppStore } from '@/stores/app.store'
import { toast } from 'sonner'

const cellOf = (row: unknown, key: string): unknown => (row as Record<string, unknown>)[key]

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  value?: (row: T) => string | number
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  className?: string
  hideOnMobile?: boolean
}

export interface FilterDef<T> {
  key: string
  label: string
  options: { value: string; label: string }[]
  match: (row: T, value: string) => boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: (row: T) => string
  filters?: FilterDef<T>[]
  exportable?: boolean
  exportName?: string
  exportTitle?: string
  pagination?: boolean
  pageSize?: number
  actions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  toolbarExtra?: ReactNode
  rowKey?: (row: T) => string
  dense?: boolean
}

export const DataTable = <T extends object,>({
  data,
  columns,
  loading,
  searchable = true,
  searchPlaceholder = 'Search records…',
  searchFields,
  filters = [],
  exportable = true,
  exportName = 'export',
  exportTitle = 'Data Export',
  pagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  actions,
  onRowClick,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Records you create will appear in this list.',
  toolbarExtra,
  rowKey,
  dense,
}: DataTableProps<T>) => {
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(pageSize)
  const organization = useAppStore((state) => state.organization)
  const session = useAppStore((state) => state.session)

  const applySearch = useMemo(() => debounce((value: string) => setSearch(value), SEARCH_DEBOUNCE_MS), [])

  const filtered = useMemo(() => {
    let rows = [...data]
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      rows = rows.filter((row) => {
        const haystack = searchFields
          ? searchFields(row)
          : columns.map((column) => String(column.value?.(row) ?? cellOf(row, column.key) ?? '')).join(' ')
        return haystack.toLowerCase().includes(term)
      })
    }
    filters.forEach((filter) => {
      const value = filterValues[filter.key]
      if (value) rows = rows.filter((row) => filter.match(row, value))
    })
    if (sortKey) {
      const column = columns.find((item) => item.key === sortKey)
      rows.sort((a, b) => {
        const left = column?.value?.(a) ?? (cellOf(a, sortKey) as string | number)
        const right = column?.value?.(b) ?? (cellOf(b, sortKey) as string | number)
        if (left === right) return 0
        if (left === null || left === undefined) return 1
        if (right === null || right === undefined) return -1
        return (left > right ? 1 : -1) * (sortAsc ? 1 : -1)
      })
    }
    return rows
  }, [data, search, filterValues, filters, sortKey, sortAsc, columns, searchFields])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(page, totalPages - 1)
  const visible = pagination ? filtered.slice(currentPage * size, currentPage * size + size) : filtered

  const exportColumns = columns.map((column) => column.header)
  const exportRows = (): (string | number)[][] =>
    filtered.map((row) =>
      columns.map((column) => {
        const raw = column.value?.(row) ?? cellOf(row, column.key)
        if (raw === null || raw === undefined) return ''
        if (typeof raw === 'object') return JSON.stringify(raw)
        return raw as string | number
      }),
    )

  const handleXlsx = async (): Promise<void> => {
    try {
      await downloadXlsx(exportName, [
        { name: exportTitle.slice(0, 28), columns: exportColumns, rows: exportRows() },
      ])
      toast.success('Excel workbook downloaded')
    } catch {
      toast.error('Unable to generate the workbook')
    }
  }

  const handlePdf = async (): Promise<void> => {
    if (!organization) return
    try {
      await downloadPdf(
        organization,
        {
          title: exportTitle,
          documentNumber: `${exportName.toUpperCase()}-${new Date().getFullYear()}`,
          verificationCode: makeVerificationCode(),
          preparedBy: session?.fullName,
          subtitle: `${filtered.length} record(s)`,
        },
        [{ kind: 'table', columns: exportColumns, rows: exportRows() }],
      )
      toast.success('PDF generated')
    } catch {
      toast.error('Unable to generate the PDF')
    }
  }

  const toggleSort = (key: string): void => {
    if (sortKey === key) {
      setSortAsc((value) => !value)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const activeFilterCount = Object.values(filterValues).filter(Boolean).length

  return (
    <div className="nl-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {searchable ? (
            <div className="relative flex-1 lg:max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                className="nl-input pl-9"
                placeholder={searchPlaceholder}
                onChange={(event) => {
                  setPage(0)
                  applySearch(event.target.value)
                }}
              />
            </div>
          ) : null}
          {filters.length ? (
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={cn('nl-btn nl-btn-subtle shrink-0', activeFilterCount && 'border-accent text-accent-light')}
            >
              <Filter size={15} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount ? (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          {exportable ? (
            <div className="flex items-center gap-1.5">
              <button type="button" className="nl-btn nl-btn-subtle px-2.5" onClick={handlePdf} title="Export PDF">
                <FileText size={15} />
                <span className="hidden xl:inline">PDF</span>
              </button>
              <button
                type="button"
                className="nl-btn nl-btn-subtle px-2.5"
                title="Export Excel"
                onClick={() => void handleXlsx()}
              >
                <FileSpreadsheet size={15} />
                <span className="hidden xl:inline">XLSX</span>
              </button>
              <button
                type="button"
                className="nl-btn nl-btn-subtle px-2.5"
                title="Export CSV"
                onClick={() => {
                  downloadCsv(exportName, exportColumns, exportRows())
                  toast.success('CSV downloaded')
                }}
              >
                <Download size={15} />
                <span className="hidden xl:inline">CSV</span>
              </button>
              <button
                type="button"
                className="nl-btn nl-btn-subtle hidden px-2.5 xl:inline-flex"
                title="Export JSON"
                onClick={() => {
                  downloadJson(exportName, filtered)
                  toast.success('JSON downloaded')
                }}
              >
                JSON
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showFilters && filters.length ? (
        <div className="grid grid-cols-1 gap-3 border-b border-line bg-card-alt/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((filter) => (
            <div key={filter.key}>
              <label className="nl-label">{filter.label}</label>
              <select
                className="nl-input"
                value={filterValues[filter.key] ?? ''}
                onChange={(event) => {
                  setPage(0)
                  setFilterValues((values) => ({ ...values, [filter.key]: event.target.value }))
                }}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-end">
            <button type="button" className="nl-btn nl-btn-subtle w-full" onClick={() => setFilterValues({})}>
              Clear filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Content */}
      {loading ? (
        <div className="p-4">
          <TableSkeleton rows={6} cols={Math.min(columns.length, 6)} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-card-alt/60">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        'border-b-2 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-2',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.className,
                      )}
                      style={{ borderBottomColor: 'var(--accent-border)' }}
                    >
                      {column.sortable === false ? (
                        column.header
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                          onClick={() => toggleSort(column.key)}
                        >
                          {column.header}
                          {sortKey === column.key ? (
                            sortAsc ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                  {actions ? <th className="w-px px-4 py-3" /> : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, index) => (
                  <tr
                    key={rowKey?.(row) ?? (cellOf(row, 'id') as string) ?? index}
                    className={cn(
                      'border-b border-line transition-colors last:border-0',
                      onRowClick && 'cursor-pointer',
                    )}
                    style={{ ['--tw-bg-opacity' as string]: '1' }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'var(--accent-glow)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = ''
                    }}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 text-ink-2',
                          dense ? 'py-2' : 'py-3',
                          column.align === 'right' && 'text-right',
                          column.align === 'center' && 'text-center',
                          column.className,
                        )}
                      >
                        {column.render ? column.render(row) : String(cellOf(row, column.key) ?? '—')}
                      </td>
                    ))}
                    {actions ? (
                      <td className="px-4 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">{actions(row)}</div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-line md:hidden">
            {visible.map((row, index) => (
              <div
                key={rowKey?.(row) ?? (cellOf(row, 'id') as string) ?? index}
                className="p-4"
                onClick={() => onRowClick?.(row)}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {columns[0] ? (
                      <div className="truncate font-semibold text-ink">
                        {columns[0].render ? columns[0].render(row) : String(cellOf(row, columns[0].key) ?? '—')}
                      </div>
                    ) : null}
                    {columns[1] ? (
                      <div className="mt-0.5 truncate text-xs text-ink-3">
                        {columns[1].render ? columns[1].render(row) : String(cellOf(row, columns[1].key) ?? '—')}
                      </div>
                    ) : null}
                  </div>
                  {actions ? (
                    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                      {actions(row)}
                    </div>
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {columns.slice(2).filter((column) => !column.hideOnMobile).map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wide text-ink-3">{column.header}</dt>
                      <dd className="truncate text-xs text-ink-2">
                        {column.render ? column.render(row) : String(cellOf(row, column.key) ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {pagination ? (
            <div className="flex flex-col gap-3 border-t border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-3">
                Showing {currentPage * size + 1}–{Math.min((currentPage + 1) * size, filtered.length)} of{' '}
                {filtered.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <select
                  className="nl-input h-9 w-auto min-h-0 py-1 text-xs"
                  value={size}
                  onChange={(event) => {
                    setSize(Number(event.target.value))
                    setPage(0)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} / page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="nl-btn nl-btn-subtle h-9 min-h-0 px-2"
                  disabled={currentPage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-ink-2">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="nl-btn nl-btn-subtle h-9 min-h-0 px-2"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
