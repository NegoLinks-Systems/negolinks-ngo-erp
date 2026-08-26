import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isBackendConfigured } from '@/constants'

/**
 * A single Supabase client for the whole app. Only the anon key is ever used in
 * the browser — every privileged operation goes through an Edge Function
 * (see supabase/functions) per the NegoLinks security baseline.
 */
let client: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient | null => {
  if (!isBackendConfigured) return null
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'negolinks-ngo-auth',
      },
      global: { headers: { 'x-negolinks-app': 'ngo-erp' } },
    })
  }
  return client
}

export const supabaseReady = isBackendConfigured

/** Invoke an Edge Function with the caller's JWT attached. */
export const invokeFunction = async <T,>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const sb = getSupabase()
  if (!sb) throw new Error('Backend is not configured')
  const { data, error } = await sb.functions.invoke<T>(name, { body })
  if (error) throw new Error(error.message)
  return data as T
}
