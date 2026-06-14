import { createClient } from '@supabase/supabase-js'
import { getServiceConfig, getSecret } from '@/lib/config'
import type { SupabaseClient } from '@supabase/supabase-js'

// No singleton — Edge Workers share module-level state across requests within
// the same isolate, so caching a privileged client here would leak the service
// role key across unrelated requests. Instantiate fresh on every call.
export function createAdminClient(): SupabaseClient {
  const { supabaseUrl } = getServiceConfig()
  const serviceKey = getSecret('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  })
}
