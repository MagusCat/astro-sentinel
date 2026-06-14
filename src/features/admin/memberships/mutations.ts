'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { freezeMembershipSchema, unfreezeMembershipSchema } from './schemas'

export async function freezeMembership(
  membershipId: string,
  targetDate: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.role || !Roles.canManageStaff(currentUser.role)) {
    return { success: false, error: 'Acceso denegado: Solo administradores pueden gestionar membresías.' }
  }

  const parsed = freezeMembershipSchema.safeParse({ membershipId, targetDate })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message }
  }

  try {
    const supabase = await createClient()

    const { error: rpcError } = await supabase
      .rpc('freeze_membership', { 
        p_membership_id: membershipId, 
        p_target_date: targetDate 
      })

    if (rpcError) {
      console.error(rpcError)
      return { success: false, error: rpcError.message }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al congelar membresía: ${msg}` }
  }
}

export async function unfreezeMembership(
  membershipId: string
): Promise<{ success: boolean; newEndDate?: string; error?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.role || !Roles.canManageStaff(currentUser.role)) {
    return { success: false, error: 'Acceso denegado: Solo administradores pueden gestionar membresías.' }
  }

  const parsed = unfreezeMembershipSchema.safeParse({ membershipId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message }
  }

  try {
    const supabase = await createClient()

    const { data: newEndDate, error: rpcError } = await supabase
      .rpc('unfreeze_membership', { p_membership_id: membershipId })

    if (rpcError) {
      console.error(rpcError)
      return { success: false, error: rpcError.message }
    }

    return { success: true, newEndDate: newEndDate as string }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al descongelar membresía: ${msg}` }
  }
}

export async function cancelMembership(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.role || !Roles.canManageStaff(currentUser.role)) {
    return { success: false, error: 'Acceso denegado: Solo administradores pueden cancelar membresías.' }
  }

  try {
    const supabase = await createClient()

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

    if (updateError) {
      console.error(updateError)
      return { success: false, error: 'Error al cancelar la membresía.' }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al cancelar membresía: ${msg}` }
  }
}
