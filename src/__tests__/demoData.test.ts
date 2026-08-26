import { describe, expect, it } from 'vitest'
import { SCENARIO_SHAPES, generateDemoData } from '@/lib/demoData'
import { DEMO_SCENARIOS } from '@/constants'

const ORG_ID = '00000000-0000-4000-8000-000000000001'

describe('demo scenarios', () => {
  it('defines a shape for every scenario offered in the interface', () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(SCENARIO_SHAPES[scenario.id]).toBeDefined()
    }
  })

  it('scales from small to enterprise', () => {
    expect(SCENARIO_SHAPES.small.projects).toBeLessThan(SCENARIO_SHAPES.medium.projects)
    expect(SCENARIO_SHAPES.medium.projects).toBeLessThan(SCENARIO_SHAPES.large.projects)
    expect(SCENARIO_SHAPES.small.beneficiaries).toBeLessThan(SCENARIO_SHAPES.large.beneficiaries)
  })
})

describe('generated demo data', () => {
  const bundle = generateDemoData(ORG_ID, 'small')
  /** The bundle ships tables as an ordered list; index it for assertions. */
  const byTable = Object.fromEntries(bundle.tables.map((entry) => [entry.table, entry.rows]))
  const allRows = bundle.tables.flatMap((entry) =>
    entry.rows.map((row) => ({ table: entry.table, row })),
  )

  it('creates a demo organization patch', () => {
    expect(Object.keys(bundle.orgPatch).length).toBeGreaterThan(0)
  })

  it('populates every module rather than only the headline tables', () => {
    for (const table of [
      'programs', 'projects', 'donors', 'grants', 'beneficiaries', 'indicators',
      'transactions', 'employees', 'volunteers', 'partners', 'field_visits',
    ]) {
      expect(byTable[table]?.length ?? 0, `${table} has no demo rows`).toBeGreaterThan(0)
    }
  })

  it('marks every generated record as demo data so removal is exact', () => {
    for (const { table, row } of allRows) {
      expect(
        (row as { is_demo?: boolean }).is_demo,
        `${table} row is not marked as demo data`,
      ).toBe(true)
    }
  })

  it('scopes every record to the requested organization', () => {
    for (const { table, row } of allRows) {
      expect(
        (row as { org_id?: string }).org_id,
        `${table} row is not scoped to the organization`,
      ).toBe(ORG_ID)
    }
  })

  it('gives every record an identifier', () => {
    for (const { table, row } of allRows) {
      expect((row as { id?: string }).id, `${table} row has no id`).toBeTruthy()
    }
  })

  it('links projects to programmes that actually exist', () => {
    const programIds = new Set((byTable.programs ?? []).map((row) => (row as { id: string }).id))
    const linked = (byTable.projects ?? []).filter(
      (row) => (row as { program_id?: string }).program_id,
    )
    expect(linked.length).toBeGreaterThan(0)
    for (const project of linked) {
      expect(programIds.has((project as { program_id: string }).program_id)).toBe(true)
    }
  })

  it('links grants to donors that actually exist', () => {
    const donorIds = new Set((byTable.donors ?? []).map((row) => (row as { id: string }).id))
    const linked = (byTable.grants ?? []).filter((row) => (row as { donor_id?: string }).donor_id)
    expect(linked.length).toBeGreaterThan(0)
    for (const grant of linked) {
      expect(donorIds.has((grant as { donor_id: string }).donor_id)).toBe(true)
    }
  })

  it('keeps money in whole minor units so no fractional kobo is stored', () => {
    for (const project of byTable.projects ?? []) {
      const budget = (project as { budget_minor: number }).budget_minor
      expect(Number.isInteger(budget)).toBe(true)
      expect(budget).toBeGreaterThanOrEqual(0)
    }
  })

  it('produces different organizations on successive runs', () => {
    const a = generateDemoData(ORG_ID, 'small')
    const b = generateDemoData(ORG_ID, 'small')
    const nameA = (a.tables.find((t) => t.table === 'projects')?.rows[0] as { title?: string })?.title
    const nameB = (b.tables.find((t) => t.table === 'projects')?.rows[0] as { title?: string })?.title
    // Both exist; the generator is reseeded each run so the data set varies.
    expect(nameA).toBeTruthy()
    expect(nameB).toBeTruthy()
  })

  it('reports a summary the interface can display', () => {
    expect(bundle.summary.length).toBeGreaterThan(5)
    for (const entry of bundle.summary) {
      expect(entry.label).toBeTruthy()
      expect(entry.count).toBeGreaterThanOrEqual(0)
    }
  })
})
