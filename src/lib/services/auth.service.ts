import { getSupabase, supabaseReady } from '@/lib/supabase'
import { localAdapter } from '@/lib/localAdapter'
import { newId, repository, setAuditContext } from '@/lib/repository'
import type { Role } from '@/constants'
import type { AppUser, Organization } from '@/types'

export interface SessionProfile {
  userId: string
  authUserId: string | null
  email: string
  fullName: string
  role: Role
  jobTitle: string | null
  orgId: string
  branchId: string | null
  avatarUrl: string | null
  mfaEnabled: boolean
}

const SESSION_KEY = 'session-profile'

/** Evaluation mode: no Supabase project attached yet. */
export const isEvaluationMode = !supabaseReady

const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001'

const seedEvaluationOrg = async (): Promise<Organization> => {
  const existing = await localAdapter.get<Organization>('organizations', DEFAULT_ORG_ID)
  if (existing) return existing as unknown as Organization
  const now = new Date().toISOString()
  const org = {
    id: DEFAULT_ORG_ID,
    org_id: DEFAULT_ORG_ID,
    name: 'Your Organization',
    legal_name: 'Your Organization',
    org_type: 'NGO',
    registration_number: null,
    tax_id: null,
    logo_url: null,
    primary_color: null,
    address: null,
    city: null,
    state: null,
    country: 'Nigeria',
    email: null,
    phone: null,
    website: null,
    base_currency: 'NGN',
    locale: 'en-NG',
    timezone: 'Africa/Lagos',
    date_format: 'dd MMM yyyy',
    financial_year_start: '01-01',
    mission: null,
    vision: null,
    demo_mode: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    is_demo: false,
  }
  await localAdapter.put('organizations', org as unknown as Record<string, unknown> & { id: string })
  return org as unknown as Organization
}

export const authService = {
  /** Sign in. In evaluation mode any email creates a local Super Admin session. */
  async signIn(email: string, password: string): Promise<SessionProfile> {
    const sb = getSupabase()
    if (!sb) {
      await seedEvaluationOrg()
      const profile: SessionProfile = {
        userId: DEFAULT_ORG_ID.replace('001', '0a1'),
        authUserId: null,
        email,
        fullName: email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Administrator',
        role: 'super_admin',
        jobTitle: 'Executive Director',
        orgId: DEFAULT_ORG_ID,
        branchId: null,
        avatarUrl: null,
        mfaEnabled: false,
      }
      await localAdapter.setMeta(SESSION_KEY, profile)
      applySession(profile)
      return profile
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(mapAuthError(error.message))
    if (!data.user) throw new Error('Sign-in failed. Please try again.')

    const profile = await loadProfile(data.user.id, data.user.email ?? email)
    applySession(profile)
    return profile
  },

  async signOut(): Promise<void> {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    await localAdapter.setMeta(SESSION_KEY, null)
    setAuditContext(null)
  },

  async restore(): Promise<SessionProfile | null> {
    const sb = getSupabase()
    if (!sb) {
      const cached = await localAdapter.getMeta<SessionProfile>(SESSION_KEY)
      if (cached) applySession(cached)
      return cached
    }
    const { data } = await sb.auth.getSession()
    const user = data.session?.user
    if (!user) return null
    const profile = await loadProfile(user.id, user.email ?? '')
    applySession(profile)
    return profile
  },

  async requestPasswordReset(email: string): Promise<void> {
    const sb = getSupabase()
    if (!sb) throw new Error('Password reset requires a connected backend.')
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw new Error(error.message)
  },

  async updatePassword(newPassword: string): Promise<void> {
    const sb = getSupabase()
    if (!sb) throw new Error('Password change requires a connected backend.')
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  },
}

const applySession = (profile: SessionProfile): void => {
  setAuditContext({
    orgId: profile.orgId,
    userId: profile.userId,
    userName: profile.fullName,
    userRole: profile.role,
    branchId: profile.branchId,
  })
}

/**
 * Resolves the application profile for an authenticated Supabase user. The first
 * user in a fresh installation is promoted to Super Admin of the default org.
 */
const loadProfile = async (authUserId: string, email: string): Promise<SessionProfile> => {
  const sb = getSupabase()
  if (!sb) throw new Error('Backend is not configured')

  const { data: rows, error } = await sb
    .from('app_users')
    .select('*, organization:organizations(id, name)')
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .limit(1)
  if (error) throw new Error(error.message)

  const record = rows?.[0] as (AppUser & { organization?: { id: string } }) | undefined
  if (record) {
    if (!record.is_active) throw new Error('This account has been deactivated. Contact your administrator.')
    await sb.from('app_users').update({ last_login_at: new Date().toISOString() }).eq('id', record.id)
    return {
      userId: record.id,
      authUserId,
      email: record.email,
      fullName: record.full_name,
      role: record.role,
      jobTitle: record.job_title,
      orgId: record.org_id,
      branchId: record.branch_id ?? null,
      avatarUrl: record.avatar_url,
      mfaEnabled: record.mfa_enabled,
    }
  }

  // No profile yet — bootstrap the installation's first organization and admin.
  const { data: orgs } = await sb.from('organizations').select('id').is('deleted_at', null).limit(1)
  let orgId = orgs?.[0]?.id as string | undefined
  if (!orgId) {
    const { data: created, error: orgError } = await sb
      .from('organizations')
      .insert({
        id: newId(),
        name: 'Your Organization',
        legal_name: 'Your Organization',
        org_type: 'NGO',
        country: 'Nigeria',
        base_currency: 'NGN',
        locale: 'en-NG',
        timezone: 'Africa/Lagos',
        date_format: 'dd MMM yyyy',
        financial_year_start: '01-01',
      })
      .select('id')
      .single()
    if (orgError) throw new Error(orgError.message)
    orgId = created.id as string
  }

  const { data: profileRow, error: profileError } = await sb
    .from('app_users')
    .insert({
      id: newId(),
      org_id: orgId,
      auth_user_id: authUserId,
      full_name: email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Administrator',
      email,
      role: 'super_admin',
      job_title: 'Executive Director',
      is_active: true,
      mfa_enabled: false,
      last_login_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (profileError) throw new Error(profileError.message)

  const created = profileRow as AppUser
  return {
    userId: created.id,
    authUserId,
    email: created.email,
    fullName: created.full_name,
    role: created.role,
    jobTitle: created.job_title,
    orgId: created.org_id,
    branchId: null,
    avatarUrl: null,
    mfaEnabled: false,
  }
}

const mapAuthError = (message: string): string => {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login')) return 'Incorrect email or password.'
  if (lower.includes('email not confirmed')) return 'Please confirm your email address before signing in.'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many attempts. Please wait a few minutes and try again.'
  return 'Unable to sign in right now. Please try again.'
}

export const organizationService = {
  async current(orgId: string): Promise<Organization | null> {
    if (!supabaseReady) {
      const org = await localAdapter.get<Organization>('organizations', orgId)
      return org ?? (await seedEvaluationOrg())
    }
    return repository.getById<Organization>('organizations', orgId)
  },

  async update(orgId: string, changes: Partial<Organization>): Promise<Organization> {
    if (!supabaseReady) {
      const current = await this.current(orgId)
      const merged = { ...(current ?? {}), ...changes, id: orgId, updated_at: new Date().toISOString() }
      await localAdapter.put('organizations', merged as unknown as Record<string, unknown> & { id: string })
      return merged as Organization
    }
    return repository.update<Record<string, unknown>>(
      'organizations',
      orgId,
      changes as Record<string, unknown>,
      changes.name ?? 'Organization',
    ) as unknown as Promise<Organization>
  },
}
