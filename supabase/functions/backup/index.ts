// =============================================================================
// backup
//
// Exports every table for one organization as a single JSON archive and records
// the run in backup_records. Intended for the scheduled nightly backup and for
// on-demand exports before an upgrade.
// =============================================================================

import { fail, json, preflight } from '../_shared/cors.ts'
import { adminClient, resolveCaller } from '../_shared/supabase.ts'

const TABLES = [
  'organizations', 'branches', 'departments', 'app_users', 'board_members',
  'programs', 'donors', 'grants', 'projects', 'project_activities', 'project_risks',
  'project_team', 'grant_disbursements', 'grant_reports', 'campaigns', 'donations',
  'households', 'beneficiaries', 'enrollments', 'service_records', 'case_files',
  'case_notes', 'indicators', 'indicator_results', 'logframe_rows', 'evaluations',
  'learning_entries', 'field_visits', 'volunteers', 'volunteer_assignments',
  'employees', 'leave_requests', 'training_records', 'partners', 'accounts', 'funds',
  'bank_accounts', 'transactions', 'budget_lines', 'purchase_requests', 'quotations',
  'purchase_orders', 'warehouses', 'inventory_items', 'stock_movements', 'assets',
  'vehicles', 'trips', 'maintenance_records', 'compliance_items', 'board_meetings',
  'board_resolutions', 'policies', 'documents', 'calendar_events', 'notifications',
  'workflow_definitions', 'workflow_instances', 'feature_flags', 'dashboard_layouts',
  'ai_configurations', 'ai_prompt_templates', 'communication_templates', 'audit_logs',
]

Deno.serve(async (req: Request) => {
  const cors = preflight(req)
  if (cors) return cors

  const started = Date.now()

  try {
    const caller = await resolveCaller(req)
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isCron = cronSecret && req.headers.get('x-cron-secret') === cronSecret

    if (!isCron && (!caller || !['super_admin', 'admin'].includes(caller.role))) {
      return fail('Only administrators can run a backup', 403)
    }

    const db = adminClient()
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const orgId: string | undefined = caller?.orgId ?? body?.orgId

    const targets = orgId
      ? [{ id: orgId }]
      : ((await db.from('organizations').select('id').is('deleted_at', null)).data ?? [])

    const archives: Record<string, unknown>[] = []

    for (const target of targets) {
      const archive: Record<string, unknown> = {
        schemaVersion: '012',
        product: 'NegoLinks NGO & Nonprofit Management ERP',
        generatedAt: new Date().toISOString(),
        orgId: target.id,
        tables: {} as Record<string, unknown[]>,
      }

      let rowCount = 0
      for (const table of TABLES) {
        const column = table === 'organizations' ? 'id' : 'org_id'
        const { data } = await db.from(table).select('*').eq(column, target.id)
        ;(archive.tables as Record<string, unknown[]>)[table] = data ?? []
        rowCount += data?.length ?? 0
      }

      archive.rowCount = rowCount
      archives.push(archive)

      await db.from('backup_records').insert({
        org_id: target.id,
        backup_type: isCron ? 'scheduled' : 'manual',
        size_bytes: JSON.stringify(archive).length,
        status: 'success',
        notes: `${rowCount} rows across ${TABLES.length} tables`,
      })
    }

    if (orgId) {
      return new Response(JSON.stringify(archives[0], null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="negolinks-ngo-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    return json({ status: 'success', organizations: archives.length, durationMs: Date.now() - started })
  } catch (error) {
    return fail((error as Error).message ?? 'Backup failed', 500)
  }
})
