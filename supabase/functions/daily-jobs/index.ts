// =============================================================================
// daily-jobs
//
// Scheduled maintenance run by pg_cron (see SETUP.md section 6). Produces the
// alerts and reminders that make the platform proactive rather than passive.
//
// Jobs
//   1. Grant expiry alerts          — grants ending within 90 days
//   2. Donor report reminders       — reports due within 14 days or overdue
//   3. Compliance calendar check    — statutory items expiring within 60 days
//   4. Budget variance analysis     — budget lines over 90% utilized
//   5. Document expiry check        — vehicle insurance and registration
//   6. Indicator collection reminder — indicators not updated this quarter
// =============================================================================

import { fail, json, preflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

const daysUntil = (date: string): number =>
  Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)

const notify = async (
  db: ReturnType<typeof adminClient>,
  orgId: string,
  rows: { title: string; body: string; severity: string; category: string; link: string }[],
): Promise<void> => {
  if (!rows.length) return
  await db.from('notifications').insert(rows.map((row) => ({ org_id: orgId, ...row })))
}

Deno.serve(async (req: Request) => {
  const cors = preflight(req)
  if (cors) return cors

  // Protected by a shared secret so only the scheduler can invoke it.
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return fail('Not authorized', 401)
  }

  const started = Date.now()
  const db = adminClient()
  const summary: Record<string, number> = {}

  try {
    const { data: organizations } = await db
      .from('organizations')
      .select('id')
      .is('deleted_at', null)

    for (const org of organizations ?? []) {
      const orgId = org.id as string
      const alerts: { title: string; body: string; severity: string; category: string; link: string }[] = []

      // 1. Grant expiry ------------------------------------------------------
      const { data: grants } = await db
        .from('grants')
        .select('code, title, end_date, stage')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .in('stage', ['active', 'reporting'])
        .not('end_date', 'is', null)

      for (const grant of grants ?? []) {
        const days = daysUntil(grant.end_date as string)
        if (days >= 0 && days <= 90) {
          alerts.push({
            title: `Grant ${grant.code} expires in ${days} days`,
            body: `${grant.title} ends on ${grant.end_date}. Begin extension or closeout planning.`,
            severity: days <= 30 ? 'danger' : 'warning',
            category: 'grants',
            link: '/app/grants',
          })
        }
      }
      summary.grant_alerts = (summary.grant_alerts ?? 0) + (grants?.length ?? 0)

      // 2. Donor reports -----------------------------------------------------
      const { data: reports } = await db
        .from('grant_reports')
        .select('title, due_date, status')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .in('status', ['pending', 'draft'])

      for (const report of reports ?? []) {
        const days = daysUntil(report.due_date as string)
        if (days <= 14) {
          alerts.push({
            title: days < 0 ? `Overdue: ${report.title}` : `Report due in ${days} days`,
            body: `${report.title} is due on ${report.due_date}.`,
            severity: days < 0 ? 'danger' : 'warning',
            category: 'grants',
            link: '/app/grants',
          })
        }
        if (days < 0) {
          await db.from('grant_reports').update({ status: 'overdue' }).eq('org_id', orgId).eq('title', report.title)
        }
      }

      // 3. Compliance --------------------------------------------------------
      const { data: compliance } = await db
        .from('compliance_items')
        .select('title, expiry_date, status')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .not('expiry_date', 'is', null)

      for (const item of compliance ?? []) {
        const days = daysUntil(item.expiry_date as string)
        if (days < 0 && item.status !== 'expired') {
          await db.from('compliance_items').update({ status: 'expired' }).eq('org_id', orgId).eq('title', item.title)
          alerts.push({
            title: `Compliance expired: ${item.title}`,
            body: `This requirement lapsed on ${item.expiry_date}. Renew it urgently.`,
            severity: 'danger',
            category: 'compliance',
            link: '/app/compliance',
          })
        } else if (days >= 0 && days <= 60) {
          await db.from('compliance_items').update({ status: 'due_soon' }).eq('org_id', orgId).eq('title', item.title)
          alerts.push({
            title: `Compliance due in ${days} days: ${item.title}`,
            body: `Renewal is due on ${item.expiry_date}.`,
            severity: 'warning',
            category: 'compliance',
            link: '/app/compliance',
          })
        }
      }

      // 4. Budget variance ---------------------------------------------------
      const { data: budgets } = await db
        .from('budget_lines')
        .select('line_item, budgeted_minor, spent_minor')
        .eq('org_id', orgId)
        .is('deleted_at', null)

      const overspent = (budgets ?? []).filter(
        (line) => (line.budgeted_minor as number) > 0 &&
          (line.spent_minor as number) / (line.budgeted_minor as number) >= 0.9,
      )
      if (overspent.length) {
        alerts.push({
          title: `${overspent.length} budget line(s) at or above 90% utilization`,
          body: 'Review these lines before further expenditure is committed.',
          severity: 'warning',
          category: 'finance',
          link: '/app/budgets',
        })
      }

      // 5. Vehicle documentation --------------------------------------------
      const { data: vehicles } = await db
        .from('vehicles')
        .select('plate_number, insurance_expiry, registration_expiry')
        .eq('org_id', orgId)
        .is('deleted_at', null)

      for (const vehicle of vehicles ?? []) {
        for (const [label, date] of [
          ['Insurance', vehicle.insurance_expiry],
          ['Registration', vehicle.registration_expiry],
        ] as [string, string | null][]) {
          if (!date) continue
          const days = daysUntil(date)
          if (days >= 0 && days <= 30) {
            alerts.push({
              title: `${label} expiring: ${vehicle.plate_number}`,
              body: `${label} for ${vehicle.plate_number} expires on ${date}.`,
              severity: days <= 7 ? 'danger' : 'warning',
              category: 'fleet',
              link: '/app/fleet',
            })
          }
        }
      }

      // 6. Indicator collection ---------------------------------------------
      const quarterAgo = new Date()
      quarterAgo.setMonth(quarterAgo.getMonth() - 3)
      const { count: staleIndicators } = await db
        .from('indicators')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .lt('updated_at', quarterAgo.toISOString())

      if ((staleIndicators ?? 0) > 0) {
        alerts.push({
          title: `${staleIndicators} indicator(s) not updated this quarter`,
          body: 'Collect and enter the latest results so reporting stays current.',
          severity: 'info',
          category: 'mel',
          link: '/app/mel',
        })
      }

      await notify(db, orgId, alerts)
      summary.notifications = (summary.notifications ?? 0) + alerts.length

      await db.from('job_runs').insert({
        org_id: orgId,
        job_key: 'daily_maintenance',
        status: 'success',
        duration_ms: Date.now() - started,
        message: `${alerts.length} alert(s) raised`,
      })
    }

    return json({ status: 'success', durationMs: Date.now() - started, ...summary })
  } catch (error) {
    return fail((error as Error).message ?? 'Job failed', 500)
  }
})
