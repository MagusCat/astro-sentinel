import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServiceConfig } from '@/lib/config'

/**
 * Credential-verification client.
 *
 * Used ONLY to validate an email/password against Supabase Auth
 * (`signInWithPassword`) during device authorization and admin login.
 *
 * Critically, it does NOT persist a session: no `sb-*` cookie is ever written
 * to the terminal's browser. The app's own httpOnly `sentinel_session` JWT is
 * the single source of authorization — the browser never holds a Supabase
 * session, so it can never talk to PostgREST directly.
 */
export function createVerifyClient(): SupabaseClient {
  const { supabaseUrl, supabasePublishableKey } = getServiceConfig()
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  })
}
