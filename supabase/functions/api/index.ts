// =============================================================================
// api  —  Public REST API,  /api/v1/*
//
// Authenticated with an X-API-Key header. Keys carry scopes and a per-hour rate
// limit, are stored only as a SHA-256 hash, and every call is audited.
//
//   GET  /api/v1/projects
//   GET  /api/v1/grants
//   GET  /api/v1/donors
//   GET  /api/v1/beneficiaries
//   GET  /api/v1/indicators
//   POST /api/v1/field-visits
// =============================================================================

import { fail, json, preflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

const READ_ROUTES: Record<string, { table: string; columns: string }> = {
  projects: {
    table: 'projects',
    columns: 'id, code, title, sector, status, start_date, end_date, location, state, budget_minor, spent_minor, currency, progress_percent, target_beneficiaries, reached_beneficiaries',
  },
  grants: {
    table: 'grants',
    columns: 'id, code, title, stage, amount_requested_minor, amount_awarded_minor, amount_disbursed_minor, currency, start_date, end_date, compliance_status',
  },
  donors: {
    table: 'donors',
    columns: 'id, code, name, donor_type, country, total_committed_minor, total_received_minor, currency, status',
  },
  beneficiaries: {
    table: 'beneficiaries',
    // Direct identifiers are deliberately excluded from API responses.
    columns: 'id, code, gender, age, state, lga, community, status, registered_on',
  },
  indicators: {
    table: 'indicators',
    columns: 'id, code, name, level, unit, baseline_value, target_value, actual_value, frequency',
  },
}

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  const cors = preflight(req)
  if (cors) return cors

  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) return fail('An X-API-Key header is required', 401)

    const db = adminClient()
    const hash = await sha256(apiKey)

    const { data: key } = await db
      .from('api_keys')
      .select('id, org_id, scopes, rate_limit, expires_at, is_active')
      .eq('key_hash', hash)
      .is('deleted_at', null)
      .maybeSingle()

    if (!key || key.is_active === false) return fail('Invalid API key', 401)
    if (key.expires_at && new Date(key.expires_at as string) < new Date()) {
      return fail('This API key has expired', 401)
    }

    // Rate limit: calls in the last hour, counted from the audit trail.
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
    const { count } = await db
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', key.org_id)
      .eq('module', 'api')
      .gte('created_at', hourAgo)

    if ((count ?? 0) >= ((key.rate_limit as number) ?? 1000)) {
      return fail('Rate limit exceeded. Try again later.', 429)
    }

    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const version = segments[segments.indexOf('v1')]
    const resource = segments[segments.length - 1]

    if (version !== 'v1') return fail('Unsupported API version. Use /api/v1/.', 404)

    const scopes = (key.scopes as string[]) ?? ['read']

    // ---- Reads -------------------------------------------------------------
    if (req.method === 'GET') {
      if (!scopes.includes('read')) return fail('This key does not permit read access', 403)

      const route = READ_ROUTES[resource ?? '']
      if (!route) return fail(`Unknown resource "${resource}"`, 404)

      const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500)
      const offset = Number(url.searchParams.get('offset') ?? 0)

      const { data, error } = await db
        .from(route.table)
        .select(route.columns)
        .eq('org_id', key.org_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) return fail(error.message, 500)

      await db.from('audit_logs').insert({
        org_id: key.org_id,
        user_name: 'API Client',
        user_role: 'api',
        action: 'VIEW',
        module: 'api',
        record_table: route.table,
        record_label: `GET /api/v1/${resource}`,
      })

      await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

      return json({ data, limit, offset, count: data?.length ?? 0 })
    }

    // ---- Writes ------------------------------------------------------------
    if (req.method === 'POST' && resource === 'field-visits') {
      if (!scopes.includes('write')) return fail('This key does not permit write access', 403)

      const payload = await req.json()
      if (!payload?.code || !payload?.location) {
        return fail('code and location are required')
      }

      const { data, error } = await db
        .from('field_visits')
        .insert({
          org_id: key.org_id,
          code: payload.code,
          visit_type: payload.visit_type ?? 'monitoring',
          visit_date: payload.visit_date ?? new Date().toISOString().slice(0, 10),
          location: payload.location,
          state: payload.state ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          participants_count: payload.participants_count ?? 0,
          female_count: payload.female_count ?? 0,
          male_count: payload.male_count ?? 0,
          findings: payload.findings ?? null,
          status: 'submitted',
        })
        .select()
        .single()

      if (error) return fail(error.message, 400)

      await db.from('audit_logs').insert({
        org_id: key.org_id,
        user_name: 'API Client',
        user_role: 'api',
        action: 'CREATE',
        module: 'api',
        record_table: 'field_visits',
        record_id: data.id,
        record_label: payload.code,
      })

      return json({ data }, 201)
    }

    return fail('Method or resource not supported', 405)
  } catch (error) {
    return fail((error as Error).message ?? 'Unexpected error', 500)
  }
})
