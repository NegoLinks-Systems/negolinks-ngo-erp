import { describe, expect, it } from 'vitest'
import {
  buildReference,
  clamp,
  daysBetween,
  formatBytes,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  groupBy,
  initials,
  isEmail,
  percentOf,
  slugify,
  sum,
  titleCase,
  toMajor,
  toMinor,
  truncate,
  unique,
} from '@/lib/utils'

describe('money handling', () => {
  it('converts major units to minor without floating point drift', () => {
    expect(toMinor(1234.56)).toBe(123456)
    expect(toMinor(0.1)).toBe(10)
    expect(toMinor(0.07)).toBe(7)
    // The classic 0.1 + 0.2 problem must not leak into stored amounts.
    expect(toMinor(0.1 + 0.2)).toBe(30)
  })

  it('round-trips through minor units', () => {
    for (const amount of [0, 1, 99.99, 1_000_000.05]) {
      expect(toMajor(toMinor(amount))).toBeCloseTo(amount, 2)
    }
  })

  it('formats currency from minor units', () => {
    const formatted = formatCurrency(123456, 'NGN')
    expect(formatted).toContain('1,234')
  })

  it('formats large amounts compactly', () => {
    expect(formatCompactCurrency(250_000_000, 'NGN')).toMatch(/2\.5\s?M/)
    expect(formatCompactCurrency(150_000, 'NGN')).toMatch(/1\.5\s?K/)
  })

  it('treats null and undefined as zero rather than throwing', () => {
    expect(formatCurrency(null)).toBeTruthy()
    expect(formatCurrency(undefined)).toBeTruthy()
  })
})

describe('percentages', () => {
  it('computes a share of a total', () => {
    expect(percentOf(25, 100)).toBe(25)
    expect(percentOf(1, 3)).toBeCloseTo(33.33, 1)
  })

  it('returns zero when the total is zero instead of dividing by zero', () => {
    expect(percentOf(10, 0)).toBe(0)
    expect(Number.isFinite(percentOf(10, 0))).toBe(true)
  })

  it('formats percentages', () => {
    expect(formatPercent(66.666)).toBe('66.7%')
  })
})

describe('collections', () => {
  const rows = [
    { sector: 'Health', amount: 100 },
    { sector: 'Health', amount: 50 },
    { sector: 'Education', amount: 75 },
  ]

  it('sums a projected field', () => {
    expect(sum(rows, (row) => row.amount)).toBe(225)
    expect(sum([], (row: { amount: number }) => row.amount)).toBe(0)
  })

  it('groups rows by key', () => {
    const grouped = groupBy(rows, (row) => row.sector)
    expect(Object.keys(grouped)).toHaveLength(2)
    expect(grouped.Health).toHaveLength(2)
  })

  it('removes duplicates', () => {
    expect(unique([1, 1, 2, 3, 3])).toEqual([1, 2, 3])
  })
})

describe('text helpers', () => {
  it('derives initials from a name', () => {
    expect(initials('Nego Ojobo')).toBe('NO')
    expect(initials('')).toBe('?')
  })

  it('title-cases snake_case values', () => {
    expect(titleCase('pending_approval')).toBe('Pending Approval')
    expect(titleCase(null)).toBe('')
  })

  it('slugifies text for identifiers', () => {
    expect(slugify('Alpha Relief Project!')).toBe('alpha-relief-project')
  })

  it('truncates long text with an ellipsis', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
    expect(truncate('abc', 5)).toBe('abc')
  })

  it('validates email addresses', () => {
    expect(isEmail('a@b.org')).toBe(true)
    expect(isEmail('not-an-email')).toBe(false)
  })

  it('builds padded document references', () => {
    expect(buildReference('PRJ', 7, 2026)).toBe('PRJ/2026/0007')
  })
})

describe('dates and numbers', () => {
  it('counts whole days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10)
    expect(daysBetween('2026-01-11', '2026-01-01')).toBe(-10)
  })

  it('clamps values to a range', () => {
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(-5, 0, 100)).toBe(0)
    expect(clamp(50, 0, 100)).toBe(50)
  })

  it('formats numbers with separators', () => {
    expect(formatNumber(1234567)).toContain('1,234,567')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1_048_576)).toBe('1 MB')
  })
})
