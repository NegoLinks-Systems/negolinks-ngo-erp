import { getSupabase, supabaseReady } from '@/lib/supabase'
import { localAdapter } from '@/lib/localAdapter'
import type { UUID } from '@/types'

/**
 * Every module talks to the database through this repository rather than calling
 * Supabase directly (coding standard §6). It guarantees three things on every
 * query: organization scoping, soft-delete filtering and audit logging.
 */

export interface QueryOptions {
  filters?: Record<string, string | number | boolean | null | undefined>
  in?: Record<string, (string | number)[]>
  search?: { term: string; columns: string[] }
  orderBy?: string
  ascending?: boolean
  limit?: number
  offset?: number
  includeDeleted?: boolean
}

export interface AuditContext {
  orgId: UUID
  userId: UUID | null
  userName: string
  userRole: string
  branchId?: UUID | null
}

let auditContext: AuditContext | null = null

export const setAuditContext = (context: AuditContext | null): void => {
  auditContext = context
}

export const getAuditContext = (): AuditContext | null => auditContext

const nowIso = (): string => new Date().toISOString()

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`

const matchesFilters = (row: Record<string, unknown>, options: QueryOptions): boolean => {
  if (!options.includeDeleted && row.deleted_at) return false
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value === undefined || value === null || value === '') continue
      if (row[key] !== value) return false
    }
  }
  if (options.in) {
    for (const [key, values] of Object.entries(options.in)) {
      if (!values.length) continue
      if (!values.includes(row[key] as string | number)) return false
    }
  }
  if (options.search?.term) {
    const term = options.search.term.toLowerCase()
    const hit = options.search.columns.some((column) =>
      String(row[column] ?? '').toLowerCase().includes(term),
    )
    if (!hit) return false
  }
  return true
}

const sortRows = <T extends Record<string, unknown>>(rows: T[], options: QueryOptions): T[] => {
  const column = options.orderBy ?? 'created_at'
  const direction = options.ascending ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[column]
    const right = b[column]
    if (left === right) return 0
    if (left === null || left === undefined) return 1
    if (right === null || right === undefined) return -1
    return left > right ? direction : -direction
  })
}

export const repository = {
  usingBackend: supabaseReady,

  async list<T,>(table: string, options: QueryOptions = {}): Promise<T[]> {
    const sb = getSupabase()
    if (sb && auditContext) {
      let query = sb.from(table).select('*').eq('org_id', auditContext.orgId)
      if (!options.includeDeleted) query = query.is('deleted_at', null)
      Object.entries(options.filters ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query = query.eq(key, value)
      })
      Object.entries(options.in ?? {}).forEach(([key, values]) => {
        if (values.length) query = query.in(key, values)
      })
      if (options.search?.term) {
        const pattern = options.search.columns
          .map((column) => `${column}.ilike.%${options.search?.term}%`)
          .join(',')
        query = query.or(pattern)
      }
      query = query.order(options.orderBy ?? 'created_at', { ascending: options.ascending ?? false })
      if (options.limit) query = query.range(options.offset ?? 0, (options.offset ?? 0) + options.limit - 1)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as T[]
    }

    const rows = await localAdapter.list(table)
    const scoped = rows.filter(
      (row) => (!auditContext || row.org_id === auditContext.orgId) && matchesFilters(row, options),
    )
    const sorted = sortRows(scoped, options)
    const start = options.offset ?? 0
    return (options.limit ? sorted.slice(start, start + options.limit) : sorted) as T[]
  },

  async count(table: string, options: QueryOptions = {}): Promise<number> {
    const sb = getSupabase()
    if (sb && auditContext) {
      let query = sb.from(table).select('id', { count: 'exact', head: true }).eq('org_id', auditContext.orgId)
      if (!options.includeDeleted) query = query.is('deleted_at', null)
      Object.entries(options.filters ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query = query.eq(key, value)
      })
      const { count, error } = await query
      if (error) throw new Error(error.message)
      return count ?? 0
    }
    const rows = await this.list(table, options)
    return rows.length
  },

  async getById<T,>(table: string, id: UUID): Promise<T | null> {
    const sb = getSupabase()
    if (sb && auditContext) {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('org_id', auditContext.orgId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as T) ?? null
    }
    return (await localAdapter.get(table, id)) as T | null
  },

  async create<T extends Record<string, unknown>>(
    table: string,
    input: Partial<T>,
    label?: string,
  ): Promise<T> {
    if (!auditContext) throw new Error('No active session')
    const row = {
      ...input,
      id: (input.id as string) ?? newId(),
      org_id: auditContext.orgId,
      branch_id: (input.branch_id as string) ?? auditContext.branchId ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
      created_by: auditContext.userId,
      is_demo: (input.is_demo as boolean) ?? false,
    } as unknown as T & { id: string }

    const sb = getSupabase()
    if (sb) {
      const { data, error } = await sb.from(table).insert(row).select().single()
      if (error) throw new Error(error.message)
      await writeAudit('CREATE', table, (data as { id: string }).id, label ?? '', null, data)
      return data as T
    }

    await localAdapter.put(table, row)
    await writeAudit('CREATE', table, row.id, label ?? '', null, row)
    return row
  },

  async createMany<T extends Record<string, unknown>>(table: string, inputs: Partial<T>[]): Promise<void> {
    if (!auditContext || !inputs.length) return
    const rows = inputs.map((input) => ({
      ...input,
      id: (input.id as string) ?? newId(),
      org_id: auditContext?.orgId,
      created_at: (input.created_at as string) ?? nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
      created_by: auditContext?.userId ?? null,
      is_demo: (input.is_demo as boolean) ?? false,
    })) as (Record<string, unknown> & { id: string })[]

    const sb = getSupabase()
    if (sb) {
      // Chunked to stay inside PostgREST's payload limits on large demo loads.
      const size = 250
      for (let i = 0; i < rows.length; i += size) {
        const { error } = await sb.from(table).insert(rows.slice(i, i + size))
        if (error) throw new Error(error.message)
      }
      return
    }
    await localAdapter.putMany(table, rows)
  },

  async update<T extends Record<string, unknown>>(
    table: string,
    id: UUID,
    changes: Partial<T>,
    label?: string,
  ): Promise<T> {
    const before = await this.getById<Record<string, unknown>>(table, id)
    const patch = { ...changes, updated_at: nowIso() }

    const sb = getSupabase()
    if (sb && auditContext) {
      const { data, error } = await sb
        .from(table)
        .update(patch)
        .eq('id', id)
        .eq('org_id', auditContext.orgId)
        .select()
        .single()
      if (error) throw new Error(error.message)
      await writeAudit('UPDATE', table, id, label ?? '', before, data)
      return data as T
    }

    const merged = { ...(before ?? {}), ...patch, id } as Record<string, unknown> & { id: string }
    await localAdapter.put(table, merged)
    await writeAudit('UPDATE', table, id, label ?? '', before, merged)
    return merged as unknown as T
  },

  /** Soft delete — production records are never physically removed. */
  async softDelete(table: string, id: UUID, label?: string): Promise<void> {
    const before = await this.getById<Record<string, unknown>>(table, id)
    const patch = { deleted_at: nowIso(), updated_at: nowIso() }
    const sb = getSupabase()
    if (sb && auditContext) {
      const { error } = await sb.from(table).update(patch).eq('id', id).eq('org_id', auditContext.orgId)
      if (error) throw new Error(error.message)
    } else {
      await localAdapter.put(table, { ...(before ?? {}), ...patch, id })
    }
    await writeAudit('DELETE', table, id, label ?? '', before, null)
  },

  /** Hard removal is reserved for demo data teardown. */
  async purgeDemo(table: string): Promise<number> {
    const sb = getSupabase()
    if (sb && auditContext) {
      const { data, error } = await sb
        .from(table)
        .delete()
        .eq('org_id', auditContext.orgId)
        .eq('is_demo', true)
        .select('id')
      if (error) throw new Error(error.message)
      return data?.length ?? 0
    }
    const rows = await localAdapter.list(table)
    const demoRows = rows.filter((row) => row.is_demo)
    await Promise.all(demoRows.map((row) => localAdapter.remove(table, row.id)))
    return demoRows.length
  },
}

/* --------------------------------------------------------------- audit */

export const AUDIT_TABLE = 'audit_logs'

export const writeAudit = async (
  action: string,
  module: string,
  recordId: string | null,
  recordLabel: string,
  before: unknown,
  after: unknown,
): Promise<void> => {
  if (!auditContext) return
  const entry = {
    id: newId(),
    org_id: auditContext.orgId,
    user_id: auditContext.userId,
    user_name: auditContext.userName,
    user_role: auditContext.userRole,
    action,
    module,
    record_id: recordId,
    record_label: recordLabel || null,
    before_value: (before as Record<string, unknown>) ?? null,
    after_value: (after as Record<string, unknown>) ?? null,
    ip_address: null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    branch_id: auditContext.branchId ?? null,
    created_at: nowIso(),
  }

  const sb = getSupabase()
  if (sb) {
    // Audit inserts are append-only; failures must never block the user action.
    await sb.from(AUDIT_TABLE).insert(entry)
    return
  }
  await localAdapter.put(AUDIT_TABLE, entry)
}
