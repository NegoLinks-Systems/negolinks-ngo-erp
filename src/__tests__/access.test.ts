import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/stores/app.store'
import { ROLE_LEVEL, type Role } from '@/constants'
import type { SessionProfile } from '@/lib/services/auth.service'

const asUser = (role: Role): SessionProfile => ({
  userId: 'user-1',
  authUserId: 'auth-1',
  orgId: 'org-1',
  branchId: null,
  fullName: 'Test User',
  email: 'test@example.org',
  role,
  jobTitle: 'Tester',
  avatarUrl: null,
  mfaEnabled: false,
})

describe('role hierarchy', () => {
  // ROLE_LEVEL is a seniority rank: 1 is the most privileged, so a more
  // senior role always carries a lower number.
  it('ranks super admin as the most senior role', () => {
    expect(ROLE_LEVEL.super_admin).toBeLessThan(ROLE_LEVEL.admin)
    expect(ROLE_LEVEL.admin).toBeLessThan(ROLE_LEVEL.manager)
    expect(ROLE_LEVEL.manager).toBeLessThan(ROLE_LEVEL.staff)
    expect(ROLE_LEVEL.staff).toBeLessThan(ROLE_LEVEL.viewer)
  })

  it('assigns every declared role a rank', () => {
    for (const role of ['super_admin', 'admin', 'manager', 'staff', 'viewer', 'auditor'] as const) {
      expect(typeof ROLE_LEVEL[role]).toBe('number')
    }
  })
})

describe('permission checks', () => {
  beforeEach(() => {
    useAppStore.setState({ session: null })
  })

  it('denies everything when nobody is signed in', () => {
    const { can } = useAppStore.getState()
    expect(can('view')).toBe(false)
    expect(can('create')).toBe(false)
    expect(can('delete')).toBe(false)
    expect(can('admin')).toBe(false)
  })

  it('lets a viewer read but not write', () => {
    useAppStore.setState({ session: asUser('viewer') })
    const { can } = useAppStore.getState()
    expect(can('view')).toBe(true)
    expect(can('create')).toBe(false)
    expect(can('edit')).toBe(false)
    expect(can('delete')).toBe(false)
    expect(can('approve')).toBe(false)
    expect(can('admin')).toBe(false)
  })

  it('lets staff create and edit but not approve or delete', () => {
    useAppStore.setState({ session: asUser('staff') })
    const { can } = useAppStore.getState()
    expect(can('view')).toBe(true)
    expect(can('create')).toBe(true)
    expect(can('edit')).toBe(true)
    expect(can('approve')).toBe(false)
    expect(can('delete')).toBe(false)
    expect(can('admin')).toBe(false)
  })

  it('lets a manager approve and delete', () => {
    useAppStore.setState({ session: asUser('manager') })
    const { can } = useAppStore.getState()
    expect(can('approve')).toBe(true)
    expect(can('delete')).toBe(true)
    expect(can('admin')).toBe(false)
  })

  it('gives an admin administrative rights', () => {
    useAppStore.setState({ session: asUser('admin') })
    const { can } = useAppStore.getState()
    expect(can('admin')).toBe(true)
    expect(can('delete')).toBe(true)
  })

  it('gives a super admin every right', () => {
    useAppStore.setState({ session: asUser('super_admin') })
    const { can } = useAppStore.getState()
    for (const action of ['view', 'create', 'edit', 'delete', 'approve', 'admin'] as const) {
      expect(can(action)).toBe(true)
    }
  })
})

describe('hasRole', () => {
  it('matches only the roles listed', () => {
    useAppStore.setState({ session: asUser('manager') })
    const { hasRole } = useAppStore.getState()
    expect(hasRole('manager')).toBe(true)
    expect(hasRole('admin', 'manager')).toBe(true)
    expect(hasRole('admin')).toBe(false)
    expect(hasRole('super_admin', 'admin')).toBe(false)
  })

  it('is false when signed out', () => {
    useAppStore.setState({ session: null })
    expect(useAppStore.getState().hasRole('viewer')).toBe(false)
  })
})

describe('theme', () => {
  beforeEach(() => {
    useAppStore.setState({ theme: 'dark' })
  })

  it('defaults to dark', () => {
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('toggles between dark and light', () => {
    useAppStore.getState().toggleTheme()
    expect(useAppStore.getState().theme).toBe('light')
    useAppStore.getState().toggleTheme()
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('applies the theme class to the document', () => {
    useAppStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    useAppStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('feature flags', () => {
  it('can be switched off and back on', () => {
    const { setFeatureFlag } = useAppStore.getState()
    setFeatureFlag('module_grants', false)
    expect(useAppStore.getState().featureFlags.module_grants).toBe(false)
    setFeatureFlag('module_grants', true)
    expect(useAppStore.getState().featureFlags.module_grants).toBe(true)
  })
})
