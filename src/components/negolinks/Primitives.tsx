import { type FC, type ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------- PageHeader */

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: { label: string; href?: string }[]
  actions?: ReactNode
  icon?: LucideIcon
}

export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, breadcrumb, actions, icon: Icon }) => (
  <div className="mb-6 border-b border-line pb-4">
    {breadcrumb?.length ? (
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-ink-3">
        {breadcrumb.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {crumb.href ? (
              <Link to={crumb.href} className="transition-colors hover:text-accent-light">
                {crumb.label}
              </Link>
            ) : (
              <span>{crumb.label}</span>
            )}
            {index < breadcrumb.length - 1 && <span className="opacity-50">/</span>}
          </span>
        ))}
      </nav>
    ) : null}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
          >
            <Icon size={20} />
          </span>
        ) : null}
        <div>
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </div>
)

/* ------------------------------------------------------------ KPICard */

export interface KPICardProps {
  title: string
  value: string
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  hint?: string
  loading?: boolean
  onClick?: () => void
}

export const KPICard: FC<KPICardProps> = ({ title, value, trend, trendUp, icon: Icon, hint, loading, onClick }) => {
  if (loading) {
    return <div className="nl-skeleton h-[118px] w-full rounded-xl" />
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'nl-card w-full p-5 text-left transition-all',
        onClick && 'hover:-translate-y-0.5 hover:shadow-lg',
      )}
      style={{ borderColor: 'var(--accent-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-2">{title}</p>
          <p className="nl-accent-text mt-2 font-display text-2xl font-bold leading-tight">{value}</p>
          {hint ? <p className="mt-1 truncate text-[11px] text-ink-3">{hint}</p> : null}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
        >
          <Icon size={19} />
        </span>
      </div>
      {trend ? (
        <p className={cn('mt-3 text-xs font-semibold', trendUp ? 'text-success' : 'text-danger')}>
          {trendUp ? '▲' : '▼'} {trend}
        </p>
      ) : null}
    </Wrapper>
  )
}

export const KPICardGrid: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
)

/* ---------------------------------------------------------- ChartCard */

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export const ChartCard: FC<ChartCardProps> = ({ title, subtitle, action, children, className, bodyClassName }) => (
  <section className={cn('nl-card flex flex-col p-5', className)}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate font-display text-sm font-bold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p> : null}
      </div>
      {action}
    </header>
    <div className={cn('flex-1', bodyClassName)}>{children}</div>
  </section>
)

/* --------------------------------------------------------- EmptyState */

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  compact?: boolean
}

export const EmptyState: FC<EmptyStateProps> = ({ icon: Icon, title, description, action, compact }) => (
  <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
    <span
      className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
      style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', opacity: 0.7 }}
    >
      <Icon size={24} />
    </span>
    <h4 className="font-display text-sm font-bold text-ink">{title}</h4>
    <p className="mt-1 max-w-sm text-xs text-ink-3">{description}</p>
    {action ? (
      <button type="button" className="nl-btn nl-btn-ghost mt-4" onClick={action.onClick}>
        {action.label}
      </button>
    ) : null}
  </div>
)

/* ------------------------------------------------------------ loaders */

export const PageLoader: FC<{ label?: string }> = ({ label = 'Loading workspace' }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
    <div className="relative h-14 w-14">
      <span
        className="absolute inset-0 animate-pulse-ring rounded-full"
        style={{ background: 'var(--accent-glow)' }}
      />
      <img src="/negolinks-logo.png" alt="" className="relative h-14 w-14 object-contain" />
    </div>
    <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">{label}…</p>
  </div>
)

export const CardSkeleton: FC<{ height?: number }> = ({ height = 118 }) => (
  <div className="nl-skeleton w-full rounded-xl" style={{ height }} />
)

export const TableSkeleton: FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((__, colIndex) => (
          <div key={colIndex} className="nl-skeleton h-9" />
        ))}
      </div>
    ))}
  </div>
)

/* -------------------------------------------------------------- Modal */

interface NegoModalProps {
  title: string
  description?: string
  isOpen: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  footer?: ReactNode
  destructive?: boolean
  children: ReactNode
}

const MODAL_SIZES: Record<NonNullable<NegoModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[96vw]',
}

export const NegoModal: FC<NegoModalProps> = ({
  title,
  description,
  isOpen,
  onClose,
  size = 'md',
  footer,
  destructive,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0"
        style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'nl-card relative flex max-h-[92vh] w-full flex-col animate-fade-up rounded-b-none sm:rounded-2xl',
          MODAL_SIZES[size],
        )}
      >
        <header
          className={cn('flex items-start justify-between gap-4 border-b border-line p-5')}
          style={destructive ? { borderBottomColor: 'rgba(239,68,68,0.4)' } : undefined}
        >
          <div>
            <h2 className={cn('font-display text-base font-bold', destructive ? 'text-danger' : 'text-ink')}>
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-ink-2">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-alt hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-4">{footer}</footer>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Badge */

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  accent: { background: 'var(--accent-glow)', color: 'var(--accent-light)' },
  success: { background: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  warning: { background: 'rgba(245,158,11,0.14)', color: '#F59E0B' },
  danger: { background: 'rgba(239,68,68,0.14)', color: '#EF4444' },
  info: { background: 'rgba(59,130,246,0.14)', color: '#3B82F6' },
  neutral: { background: 'var(--bg-card-alt)', color: 'var(--text-secondary)' },
}

export const Badge: FC<{ tone?: BadgeTone; children: ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <span className={cn('nl-chip', className)} style={TONE_STYLES[tone]}>
    {children}
  </span>
)

/** Maps the status vocabulary used across modules to a badge tone. */
export const statusTone = (status: string): BadgeTone => {
  const value = status?.toLowerCase() ?? ''
  if (['active', 'approved', 'completed', 'received', 'valid', 'compliant', 'posted', 'passed', 'accepted', 'awarded', 'held', 'available', 'in_use', 'final', 'signed', 'verified', 'running', 'success'].includes(value))
    return 'success'
  if (['pending', 'pending_approval', 'draft', 'proposal', 'planned', 'in_progress', 'under_review', 'submitted', 'expected', 'due_soon', 'at_risk', 'pending_review', 'assessment', 'mitigating', 'on_leave', 'reporting', 'issued', 'ordered', 'paused', 'scheduled', 'applicant', 'maintenance'].includes(value))
    return 'warning'
  if (['rejected', 'suspended', 'overdue', 'expired', 'breach', 'non_compliant', 'failed', 'cancelled', 'lost', 'grounded', 'delayed', 'blacklisted', 'dropped', 'reversed'].includes(value))
    return 'danger'
  if (['closed', 'archived', 'exited', 'inactive', 'dormant', 'disposed', 'retired', 'graduated'].includes(value))
    return 'neutral'
  return 'accent'
}

/* ------------------------------------------------------- ProgressBar */

export const ProgressBar: FC<{ value: number; tone?: string; className?: string; showLabel?: boolean }> = ({
  value,
  tone,
  className,
  showLabel,
}) => {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-alt">
        <div
          data-progress-fill
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full transition-all"
          style={{
            width: `${clamped}%`,
            background: tone ?? 'linear-gradient(90deg, var(--accent-primary), var(--accent-light))',
          }}
        />
      </div>
      {showLabel ? <span className="w-10 text-right text-[11px] font-semibold text-ink-2">{Math.round(clamped)}%</span> : null}
    </div>
  )
}

/* ---------------------------------------------------------- FormCard */

export const FormCard: FC<{ title?: string; description?: string; children: ReactNode; className?: string }> = ({
  title,
  description,
  children,
  className,
}) => (
  <section className={cn('nl-card p-5', className)}>
    {title ? (
      <header className="mb-4">
        <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-ink-3">{description}</p> : null}
      </header>
    ) : null}
    {children}
  </section>
)

export const FormRow: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>
)

export const FormField: FC<{
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  className?: string
  /** Id of the control this label describes, so assistive technology can pair them. */
  htmlFor?: string
}> = ({ label, required, error, hint, children, className, htmlFor }) => (
  <div className={className}>
    <label className="nl-label" htmlFor={htmlFor}>
      {label}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    {!error && hint ? <p className="mt-1 text-[11px] text-ink-3">{hint}</p> : null}
  </div>
)

/* --------------------------------------------------------- SectionNav */

export const TabBar: FC<{
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
  className?: string
}> = ({ tabs, active, onChange, className }) => (
  <div className={cn('scrollbar-none mb-5 flex gap-1 overflow-x-auto border-b border-line', className)}>
    {tabs.map((tab) => {
      const isActive = tab.key === active
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors',
            isActive ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? (
            <span className="ml-1.5 rounded-full bg-card-alt px-1.5 py-0.5 text-[10px] font-bold text-ink-2">
              {tab.count}
            </span>
          ) : null}
          {isActive ? (
            <span
              className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
              style={{ background: 'var(--accent-primary)' }}
            />
          ) : null}
        </button>
      )
    })}
  </div>
)
