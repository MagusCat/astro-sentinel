import { createClient } from '@supabase/supabase-js'
import { getServiceConfig, getSecret } from '@/lib/config'
import type { SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const { supabaseUrl } = getServiceConfig()
    _adminClient = createClient(supabaseUrl, getSecret('SUPABASE_SERVICE_ROLE_KEY'), {
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    })
  }
  return _adminClient
}
