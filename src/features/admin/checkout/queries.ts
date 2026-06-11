'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CheckMembershipResult } from './types'
import { MEMBERSHIP_STATUS } from '@/lib/config'

export async function findActiveMembership(
  supabase: SupabaseClient,
  client_id: string,
  class_id: string
): Promise<{ id: string; end_date: string; status: string } | null> {
  const todayStr = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('memberships')
    .select('id, end_date, status, class_plans!inner(class_id)')
    .eq('client_id', client_id)
    .in('status', [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.FROZEN])
    .gte('end_date', todayStr)
    .eq('class_plans.class_id', class_id)
    .order('end_date', { ascending: false })
    .limit(1)
  return data && data.length > 0 ? data[0] as { id: string; end_date: string; status: string } : null
}

export async function checkClientMembership(
  client_id: string,
  class_id: string
): Promise<CheckMembershipResult> {
  try {
    const supabase = await createClient()
    const found = await findActiveMembership(supabase, client_id, class_id)
    if (found) {
      return { hasMembership: true, endDate: found.end_date, membershipId: found.id, status: found.status as CheckMembershipResult['status'] }
    }
    return { hasMembership: false }
  } catch (err) {
    return { hasMembership: false, error: String(err) }
  }
}
