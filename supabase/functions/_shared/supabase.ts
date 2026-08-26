import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

/** Service-role client. Bypasses row level security — server-side use only. */
export const adminClient = (): SupabaseClient =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

export interface Caller {
  userId: string
  orgId: string
  role: string
  fullName: string
}

/** Resolves the signed-in user from their Authorization header. */
export const resolveCaller = async (req: Request): Promise<Caller | null> => {
  const header = req.headers.get('Authorization')
  if (!header) return null

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: header } }, auth: { persistSession: false } },
  )

  const { data: auth } = await client.auth.getUser()
  if (!auth?.user) return null

  const { data } = await adminClient()
    .from('app_users')
    .select('id, org_id, role, full_name')
    .eq('auth_user_id', auth.user.id)
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null
  return {
    userId: data.id as string,
    orgId: data.org_id as string,
    role: data.role as string,
    fullName: data.full_name as string,
  }
}

/** Writes an entry to the immutable audit trail. */
export const writeAudit = async (
  orgId: string,
  entry: Record<string, unknown>,
): Promise<void> => {
  await adminClient().from('audit_logs').insert({ org_id: orgId, ...entry })
}
