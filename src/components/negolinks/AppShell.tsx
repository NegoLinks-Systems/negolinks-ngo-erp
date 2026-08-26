import { useEffect, useState, type FC, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { BRAND, PRODUCT, ROLE_LABELS } from '@/constants'
import { cn, initials, timeAgo } from '@/lib/utils'
import { useAppStore } from '@/stores/app.store'
import { MOBILE_NAV, NAV_SECTIONS } from '@/components/negolinks/navigation'
import { AIPanel } from '@/components/negolinks/AIPanel'
import { UniversalSearch } from '@/components/negolinks/UniversalSearch'
import { useCollection, useUpdateRecord } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import type { NotificationRecord } from '@/types'
import { Badge } from '@/components/negolinks/Primitives'

interface AppShellProps {
  children: ReactNode
  aiModule: string
  aiContext: string
}

export const AppShell: FC<AppShellProps> = ({ children, aiModule, aiContext }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    session,
    organization,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNav,
    aiPanelOpen,
    setAiPanel,
    searchOpen,
    setSearchOpen,
    demoMode,
    featureFlags,
    signOut,
  } = useAppStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const { data: notifications = [] } = useCollection<NotificationRecord>(TABLES.notifications, {
    orderBy: 'created_at',
    limit: 40,
  })
  const updateNotification = useUpdateRecord<NotificationRecord>(TABLES.notifications, 'Notification')
  const unread = notifications.filter((item) => !item.read).length

  useEffect(() => {
    setMobileNav(false)
    setUserMenuOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname, setMobileNav])

  useEffect(() => {
    document.title = `${organization?.name ?? BRAND.name} | ${PRODUCT.shortName}`
  }, [organization?.name])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  const handleSignOut = async (): Promise<void> => {
    await signOut()
    queryClient.clear()
    navigate('/login')
  }

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.flag && featureFlags[item.flag] === false) return false
      if (item.roles && session && !item.roles.includes(session.role)) return false
      return true
    }),
  })).filter((section) => section.items.length > 0)

  const sidebar = (
    <nav className="flex h-full flex-col bg-surface">
      <div className={cn('flex h-16 items-center gap-2.5 border-b border-line px-4', sidebarCollapsed && 'lg:justify-center lg:px-2')}>
        {organization?.logo_url ? (
          <img src={organization.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-deep))' }}
          >
            {initials(organization?.name ?? 'NG')}
          </span>
        )}
        {!sidebarCollapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{organization?.name ?? 'Organization'}</span>
            <span className="block truncate text-[10px] uppercase tracking-wider text-ink-3">{PRODUCT.shortName}</span>
          </span>
        ) : null}
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-card-alt hover:text-ink lg:hidden"
          onClick={() => setMobileNav(false)}
          aria-label="Close menu"
        >
          <X size={17} />
        </button>
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto py-3">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-3">
            {!sidebarCollapsed ? <p className="nl-section-title px-4 pb-1.5">{section.title}</p> : null}
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/app'}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[44px] items-center gap-3 px-4 py-2 text-sm transition-colors',
                    sidebarCollapsed && 'lg:justify-center lg:px-2',
                    isActive ? 'font-semibold' : 'text-ink-2 hover:bg-card-alt hover:text-ink',
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        borderLeft: '4px solid var(--accent-primary)',
                        background: 'var(--accent-glow)',
                        color: 'var(--accent-light)',
                        paddingLeft: sidebarCollapsed ? undefined : 12,
                      }
                    : undefined
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={17} className="shrink-0" />
                {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-3 transition-colors hover:bg-card-alt hover:text-ink lg:flex"
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!sidebarCollapsed ? 'Collapse' : null}
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-line transition-all duration-300 lg:block',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0"
            style={{ background: 'var(--overlay)' }}
            onClick={() => setMobileNav(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] animate-slide-in border-r border-line">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top navbar */}
        <header
          className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-line px-3 sm:px-4"
          style={{ background: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)', backdropFilter: 'blur(10px)' }}
        >
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-card-alt lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-line bg-card-alt px-3 text-left text-sm text-ink-3 transition-colors hover:border-accent md:max-w-md"
          >
            <Search size={15} className="shrink-0" />
            <span className="truncate">Search everything…</span>
            <kbd className="ml-auto hidden rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold md:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAiPanel(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-card-alt"
              style={{ color: 'var(--accent-primary)' }}
              aria-label="Open AI Assistance"
              title="AI Assistance"
            >
              <Sparkles size={18} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-card-alt"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((value) => !value)
                  setUserMenuOpen(false)
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-card-alt"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="nl-card absolute right-0 top-12 z-50 max-h-[70vh] w-[92vw] max-w-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="text-sm font-bold text-ink">Notifications</h3>
                    <button
                      type="button"
                      className="text-xs text-accent-light hover:underline"
                      onClick={() => {
                        notifications
                          .filter((item) => !item.read)
                          .slice(0, 20)
                          .forEach((item) =>
                            updateNotification.mutate({
                              id: item.id,
                              changes: { read: true, read_at: new Date().toISOString() },
                            }),
                          )
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[54vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-ink-3">You have no notifications.</p>
                    ) : (
                      notifications.slice(0, 25).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!item.read) {
                              updateNotification.mutate({
                                id: item.id,
                                changes: { read: true, read_at: new Date().toISOString() },
                              })
                            }
                            if (item.action_url) {
                              setNotificationsOpen(false)
                              navigate(item.action_url)
                            }
                          }}
                          className={cn(
                            'flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-card-alt',
                          )}
                          style={!item.read ? { background: 'var(--accent-glow)' } : undefined}
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: item.read ? 'var(--text-muted)' : 'var(--accent-primary)' }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-ink">{item.title}</span>
                            <span className="mt-0.5 block line-clamp-2 text-[11px] text-ink-2">{item.message}</span>
                            <span className="mt-1 block text-[10px] text-ink-3">{timeAgo(item.created_at)}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <Link
                    to="/app/settings/notifications"
                    className="block border-t border-line py-2.5 text-center text-xs text-accent-light hover:underline"
                  >
                    Notification settings
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((value) => !value)
                  setNotificationsOpen(false)
                }}
                className="flex h-10 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-card-alt"
                aria-label="Account menu"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-deep))' }}
                >
                  {initials(session?.fullName)}
                </span>
                <span className="hidden text-left xl:block">
                  <span className="block max-w-[140px] truncate text-xs font-semibold text-ink">{session?.fullName}</span>
                  <span className="block text-[10px] text-ink-3">{session ? ROLE_LABELS[session.role] : ''}</span>
                </span>
              </button>

              {userMenuOpen ? (
                <div className="nl-card absolute right-0 top-12 z-50 w-60 overflow-hidden">
                  <div className="border-b border-line p-4">
                    <p className="truncate text-sm font-semibold text-ink">{session?.fullName}</p>
                    <p className="truncate text-xs text-ink-3">{session?.email}</p>
                    <Badge tone="accent" className="mt-2">
                      {session ? ROLE_LABELS[session.role] : ''}
                    </Badge>
                  </div>
                  <Link to="/app/settings/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 hover:bg-card-alt hover:text-ink">
                    <User size={15} /> My profile
                  </Link>
                  <Link to="/app/settings/organization" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 hover:bg-card-alt hover:text-ink">
                    <Building2 size={15} /> Organization
                  </Link>
                  <Link to="/app/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-2 hover:bg-card-alt hover:text-ink">
                    <SettingsIcon size={15} /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-sm text-danger hover:bg-card-alt"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {demoMode ? (
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold tracking-widest"
            style={{
              background: 'linear-gradient(90deg, var(--accent-glow), transparent)',
              borderBottom: '1px solid var(--accent-border)',
              color: 'var(--accent-light)',
            }}
          >
            <Zap size={13} /> DEMO MODE — SAMPLE DATA LOADED
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-content flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>

        <footer className="border-t border-line px-4 py-4 text-center sm:px-6">
          <p className="text-[11px] text-ink-3">
            Powered by{' '}
            <a href={BRAND.website} target="_blank" rel="noreferrer" className="hover:text-accent-light">
              {BRAND.suite}
            </a>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-3">
            © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
          </p>
        </footer>

        {/* Mobile bottom navigation */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface lg:hidden">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                  isActive ? '' : 'text-ink-3',
                )
              }
              style={({ isActive }) => (isActive ? { color: 'var(--accent-primary)' } : undefined)}
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <AIPanel isOpen={aiPanelOpen} onClose={() => setAiPanel(false)} module={aiModule} context={aiContext} />
      <UniversalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

/** Small helper used by settings pages to show a saved state. */
export const SavedTick: FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    <span className="flex items-center gap-1 text-xs font-semibold text-success">
      <Check size={13} /> Saved
    </span>
  ) : null
