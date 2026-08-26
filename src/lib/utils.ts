import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CURRENCIES } from '@/constants'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

/** Money is stored as BIGINT minor units (kobo/cents) everywhere in the schema. */
export const toMinor = (major: number, decimals = 2): number =>
  Math.round(major * Math.pow(10, decimals))

export const toMajor = (minor: number, decimals = 2): number => minor / Math.pow(10, decimals)

export const currencyMeta = (code: string) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]

export const formatCurrency = (
  minorAmount: number | null | undefined,
  code = 'NGN',
  locale = 'en-NG',
): string => {
  const meta = currencyMeta(code)
  const value = toMajor(minorAmount ?? 0, meta.decimals)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: meta.decimals,
    }).format(value)
  } catch {
    return `${meta.symbol}${value.toLocaleString(locale)}`
  }
}

/** Compact money for KPI cards: ₦24.5M */
export const formatCompactCurrency = (minorAmount: number | null | undefined, code = 'NGN'): string => {
  const meta = currencyMeta(code)
  const value = toMajor(minorAmount ?? 0, meta.decimals)
  const abs = Math.abs(value)
  const unit = abs >= 1e9 ? 'B' : abs >= 1e6 ? 'M' : abs >= 1e3 ? 'K' : ''
  const divisor = unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1
  const shown = value / divisor
  const digits = unit && Math.abs(shown) < 100 ? 1 : 0
  return `${meta.symbol}${shown.toFixed(digits)}${unit}`
}

export const formatNumber = (value: number | null | undefined, locale = 'en-NG'): string =>
  (value ?? 0).toLocaleString(locale)

export const formatPercent = (value: number | null | undefined, digits = 1): string =>
  `${(value ?? 0).toFixed(digits)}%`

export const formatDate = (value: string | Date | null | undefined, withTime = false): string => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('en-GB', opts).format(date)
}

export const timeAgo = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

/**
 * Whole days from `from` to `to`.
 *
 * Positive when `to` is later than `from`, so `daysBetween(new Date(), expiry)`
 * reads as "days remaining" and goes negative once the date has passed.
 */
export const daysBetween = (from: string | Date, to: string | Date = new Date()): number => {
  const start = typeof from === 'string' ? new Date(from) : from
  const end = typeof to === 'string' ? new Date(to) : to
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export const initials = (name: string | null | undefined): string =>
  (name?.trim() || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export const titleCase = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

export const truncate = (value: string, max = 80): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Deterministic pseudo-random colour for avatars and chart legends. */
export const colorFromString = (value: string, palette: readonly string[]): string => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length] as string
}

export const sum = <T,>(rows: T[], pick: (row: T) => number | null | undefined): number =>
  rows.reduce((total, row) => total + (pick(row) ?? 0), 0)

export const groupBy = <T,>(rows: T[], pick: (row: T) => string): Record<string, T[]> =>
  rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = pick(row) || 'Unspecified'
    ;(acc[key] ??= []).push(row)
    return acc
  }, {})

export const unique = <T,>(values: T[]): T[] => Array.from(new Set(values))

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const percentOf = (part: number, total: number): number =>
  total <= 0 ? 0 : clamp((part / total) * 100, 0, 999)

/** Human readable byte size. */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded = value.toFixed(1)
  return `${rounded.endsWith('.0') ? rounded.slice(0, -2) : rounded} ${units[unitIndex]}`
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const debounce = <A extends unknown[]>(fn: (...args: A) => void, wait: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/** Reference-number generator: NGO/PRJ/2026/0001 */
export const buildReference = (prefix: string, sequence: number, year = new Date().getFullYear()): string =>
  `${prefix}/${year}/${String(sequence).padStart(4, '0')}`

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/** Equirectangular projection used by the field-operations coverage map. */
export const projectLatLng = (
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  size: { width: number; height: number },
): { x: number; y: number } => {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * size.width
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * size.height
  return { x: clamp(x, 0, size.width), y: clamp(y, 0, size.height) }
}
