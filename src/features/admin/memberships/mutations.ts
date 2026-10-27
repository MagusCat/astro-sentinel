'use server'

import { revalidateTag } from 'next/cache'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { DASHBOARD_CACHE_TAG } from '../dashboard/cache'
import { freezeMembershipSchema, unfreezeMembershipSchema } from './schemas'
import { z } from 'zod'

export async function freezeMembership(
  membershipId: string,
  targetDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = freezeMembershipSchema.safeParse({ membershipId, targetDate })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }

    const { error: rpcError } = await supabase
      .rpc('freeze_membership', {
        p_membership_id: parsed.data.membershipId,
        p_target_date: parsed.data.targetDate
      })

    if (rpcError) throw rpcError

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al congelar membresía.') }
  }
}

export async function unfreezeMembership(
  membershipId: string
): Promise<{ success: boolean; newEndDate?: string; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = unfreezeMembershipSchema.safeParse({ membershipId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }

    const { data: newEndDate, error: rpcError } = await supabase
      .rpc('unfreeze_membership', { p_membership_id: parsed.data.membershipId })

    if (rpcError) throw rpcError

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true, newEndDate: newEndDate as string }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al descongelar membresía.') }
  }
}

export async function cancelMembership(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsedId = z.string().uuid().safeParse(membershipId)
    if (!parsedId.success) {
      return { success: false, error: 'ID de membresía inválido.' }
    }

    const { data: membership, error: fetchError } = await supabase
      .from('memberships')
      .select('status')
      .eq('id', membershipId)
      .single()

    if (fetchError || !membership) {
      return { success: false, error: 'Membresía no encontrada.' }
    }

    if (
      membership.status !== 'active' &&
      membership.status !== 'frozen'
    ) {
      return { success: false, error: 'Solo se pueden cancelar membresías activas o pausadas.' }
    }

    const { error: updateError } = await supabase
      .from('memberships')
      .update({ status: 'cancelled' })
      .eq('id', membershipId)

    if (updateError) throw updateError

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al cancelar membresía.') }
  }
}
