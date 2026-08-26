import { create } from 'zustand'
import { authService, organizationService, type SessionProfile } from '@/lib/services/auth.service'
import { localAdapter } from '@/lib/localAdapter'
import type { Organization } from '@/types'
import type { Role } from '@/constants'

export type ThemeMode = 'dark' | 'light'

interface AppState {
  booted: boolean
  session: SessionProfile | null
  organization: Organization | null
  theme: ThemeMode
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  aiPanelOpen: boolean
  searchOpen: boolean
  demoMode: boolean
  featureFlags: Record<string, boolean>

  boot: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshOrganization: () => Promise<void>
  setOrganization: (org: Organization) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setMobileNav: (open: boolean) => void
  setAiPanel: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setDemoMode: (active: boolean) => void
  setFeatureFlag: (key: string, enabled: boolean) => void
  hasRole: (...roles: Role[]) => boolean
  can: (action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'admin') => boolean
}

const THEME_KEY = 'negolinks-ngo-theme'

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  module_finance: true,
  module_procurement: true,
  module_inventory: true,
  module_fleet: true,
  module_hr: true,
  module_cases: true,
  module_governance: true,
  ai_executive_assistant: true,
  ai_smart_insights: true,
  ai_document_drafting: true,
  ai_forecasting: true,
  beta_dashboard_builder: true,
  beta_offline_field_capture: true,
  integration_whatsapp: true,
  integration_sms: true,
  integration_email: true,
  future_donor_portal: false,
  future_mobile_field_app: false,
}

const readTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(THEME_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export const applyThemeToDocument = (theme: ThemeMode): void => {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
  root.style.colorScheme = theme
  window.localStorage.setItem(THEME_KEY, theme)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#080810' : '#f5f5fa')
}

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  session: null,
  organization: null,
  theme: readTheme(),
  sidebarCollapsed: false,
  mobileNavOpen: false,
  aiPanelOpen: false,
  searchOpen: false,
  demoMode: false,
  featureFlags: DEFAULT_FEATURE_FLAGS,

  async boot() {
    applyThemeToDocument(get().theme)
    try {
      const session = await authService.restore()
      if (session) {
        const organization = await organizationService.current(session.orgId)
        const flags = (await localAdapter.getMeta<Record<string, boolean>>('feature-flags')) ?? {}
        set({
          session,
          organization,
          demoMode: Boolean(organization?.demo_mode),
          featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...flags },
        })
      }
    } catch {
      // A failed restore simply means the visitor stays signed out.
    } finally {
      set({ booted: true })
    }
  },

  async signIn(email, password) {
    const session = await authService.signIn(email, password)
    const organization = await organizationService.current(session.orgId)
    const flags = (await localAdapter.getMeta<Record<string, boolean>>('feature-flags')) ?? {}
    set({
      session,
      organization,
      demoMode: Boolean(organization?.demo_mode),
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...flags },
    })
  },

  async signOut() {
    await authService.signOut()
    set({ session: null, organization: null, demoMode: false, aiPanelOpen: false })
  },

  async refreshOrganization() {
    const { session } = get()
    if (!session) return
    const organization = await organizationService.current(session.orgId)
    set({ organization, demoMode: Boolean(organization?.demo_mode) })
  },

  setOrganization(organization) {
    set({ organization, demoMode: Boolean(organization.demo_mode) })
  },

  setTheme(theme) {
    applyThemeToDocument(theme)
    set({ theme })
  },

  toggleTheme() {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
    applyThemeToDocument(next)
    set({ theme: next })
  },

  toggleSidebar() {
    set({ sidebarCollapsed: !get().sidebarCollapsed })
  },

  setMobileNav(open) {
    set({ mobileNavOpen: open })
  },

  setAiPanel(open) {
    set({ aiPanelOpen: open })
  },

  setSearchOpen(open) {
    set({ searchOpen: open })
  },

  setDemoMode(active) {
    set({ demoMode: active })
  },

  setFeatureFlag(key, enabled) {
    const flags = { ...get().featureFlags, [key]: enabled }
    set({ featureFlags: flags })
    // Persistence is best effort: a browser with storage blocked still gets the
    // flag change for this session, it simply is not remembered next time.
    void localAdapter.setMeta('feature-flags', flags).catch(() => undefined)
  },

  hasRole(...roles) {
    const role = get().session?.role
    return Boolean(role && roles.includes(role))
  },

  can(action) {
    const role = get().session?.role
    if (!role) return false
    switch (action) {
      case 'view':
        return true
      case 'export':
        return role !== 'viewer'
      case 'create':
      case 'edit':
        return ['super_admin', 'admin', 'manager', 'staff'].includes(role)
      case 'approve':
        return ['super_admin', 'admin', 'manager'].includes(role)
      case 'delete':
        return ['super_admin', 'admin', 'manager'].includes(role)
      case 'admin':
        return ['super_admin', 'admin'].includes(role)
      default:
        return false
    }
  },
}))

export const useSession = (): SessionProfile | null => useAppStore((state) => state.session)
export const useOrganization = (): Organization | null => useAppStore((state) => state.organization)
export const useFeatureFlag = (key: string): boolean =>
  useAppStore((state) => state.featureFlags[key] ?? false)
export const useCurrency = (): string =>
  useAppStore((state) => state.organization?.base_currency ?? 'NGN')
