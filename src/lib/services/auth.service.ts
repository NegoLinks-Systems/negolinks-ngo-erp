import { getSupabase, supabaseReady } from '@/lib/supabase'
import { localAdapter } from '@/lib/localAdapter'
import { repository, setAuditContext } from '@/lib/repository'
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

  /** True when this installation has no organization and needs first-time setup. */
  async needsBootstrap(): Promise<boolean> {
    const sb = getSupabase()
    if (!sb) return false
    const { data, error } = await sb.rpc('needs_bootstrap')
    if (error) return false
    return data === true
  },

  /** Creates the Supabase auth account used for first-time setup. */
  async signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const sb = getSupabase()
    if (!sb) throw new Error('Creating an account requires a connected backend.')
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) throw new Error(mapAuthError(error.message))
    // When email confirmation is switched on, Supabase returns a user with no session.
    return { needsConfirmation: Boolean(data.user && !data.session) }
  },

  /**
   * Completes first-time setup: creates the organization and makes the signed-in
   * account its Super Admin. Refuses once an organization already exists.
   */
  async bootstrapFirstAdmin(input: {
    organizationName: string
    fullName: string
    country?: string
    currency?: string
  }): Promise<SessionProfile> {
    const sb = getSupabase()
    if (!sb) throw new Error('First-time setup requires a connected backend.')

    const { data: auth } = await sb.auth.getUser()
    if (!auth?.user) throw new Error('Please sign in before completing setup.')

    const { data, error } = await sb.rpc('bootstrap_first_admin', {
      p_org_name: input.organizationName,
      p_full_name: input.fullName,
      p_email: auth.user.email ?? null,
      p_country: input.country ?? 'Nigeria',
      p_currency: input.currency ?? 'NGN',
    })
    if (error) throw new Error(error.message)

    const created = (Array.isArray(data) ? data[0] : data) as AppUser | null
    if (!created) throw new Error('Setup did not complete. Please try again.')

    const profile: SessionProfile = {
      userId: created.id,
      authUserId: auth.user.id,
      email: created.email,
      fullName: created.full_name,
      role: created.role,
      jobTitle: created.job_title,
      orgId: created.org_id,
      branchId: null,
      avatarUrl: null,
      mfaEnabled: false,
    }
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

  // No profile yet. Either this account was invited by an administrator and is
  // signing in for the first time, or it does not belong here at all. The
  // claim_invitation function decides — it links a pending row that carries this
  // verified email address, and does nothing otherwise.
  const { data: claimed, error: claimError } = await sb.rpc('claim_invitation')
  if (claimError) throw new Error(claimError.message)

  const linked = (Array.isArray(claimed) ? claimed[0] : claimed) as AppUser | null
  if (!linked) {
    throw new Error(
      'This account is not linked to an organization yet. Ask an administrator to invite you, or complete first-time setup if this is a new installation.',
    )
  }

  return {
    userId: linked.id,
    authUserId,
    email: linked.email || email,
    fullName: linked.full_name,
    role: linked.role,
    jobTitle: linked.job_title,
    orgId: linked.org_id,
    branchId: linked.branch_id ?? null,
    avatarUrl: linked.avatar_url,
    mfaEnabled: linked.mfa_enabled,
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
