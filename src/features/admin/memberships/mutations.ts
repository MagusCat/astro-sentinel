'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { MembershipRecord } from './types'
import { freezeMembershipSchema, unfreezeMembershipSchema } from './schemas'
import { calcRemainingDays, getTodayStr, MEMBERSHIP_FIELDS } from './utils'

export async function freezeMembership(
  membershipId: string,
  freezeDays: number
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.role) {
    return { success: false, error: 'Acceso denegado: Sesión inválida.' }
  }

  const parsed = freezeMembershipSchema.safeParse({ membershipId, freezeDays })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message }
  }

  try {
    const supabase = await createClient()

    const { data: membership, error: fetchError } = await supabase
      .from('memberships')
      .select('end_date, status, client_id, class_plan_id')
      .eq('id', membershipId)
      .single()

    if (fetchError || !membership) {
      return { success: false, error: 'Membresía no encontrada.' }
    }

    if (membership.status !== 'active') {
      return { success: false, error: 'Solo se pueden congelar membresías activas.' }
    }

    const { data: planData } = await supabase
      .from('class_plans')
      .select('class_id')
      .eq('id', membership.class_plan_id)
      .single()

    if (planData) {
      const { data: futureMemberships } = await supabase
        .from('memberships')
        .select('id, class_plans!inner(class_id)')
        .eq('client_id', membership.client_id)
        .eq('status', 'active')
        .eq('class_plans.class_id', planData.class_id)
        .gt('start_date', getTodayStr())
      
      if (futureMemberships && futureMemberships.some(f => f.id !== membershipId)) {
        return { success: false, error: 'No se puede pausar si hay membresías en cola.' }
      }
    }

    const remainingDays = calcRemainingDays(membership.end_date)

    const { error: updateError } = await supabase
      .from('memberships')
      .update({ status: 'frozen', remaining_days: remainingDays, frozen_days: freezeDays })
      .eq('id', membershipId)

    if (updateError) {
      console.error(updateError)
      return { success: false, error: 'Error al actualizar el estado de la membresía.' }
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
  if (!currentUser?.role) {
    return { success: false, error: 'Acceso denegado: Sesión inválida.' }
  }

  const parsed = unfreezeMembershipSchema.safeParse({ membershipId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message }
  }

  try {
    const supabase = await createClient()

    const { data: oldMembership, error: fetchError } = await supabase
      .from('memberships')
      .select(MEMBERSHIP_FIELDS)
      .eq('id', membershipId)
      .single()

    if (fetchError || !oldMembership) {
      return { success: false, error: 'Membresía no encontrada.' }
    }

    const typedMembership = oldMembership as MembershipRecord

    if (typedMembership.status !== 'frozen') {
      return { success: false, error: 'La membresía no está congelada.' }
    }

    const totalDaysToGrant = typedMembership.remaining_days || 0

    const todayStr = getTodayStr()
    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + totalDaysToGrant)
    const finalEndDateStr = newEndDate.toISOString().split('T')[0]

    const { error: insertError } = await supabase
      .from('memberships')
      .insert({
        payment_id: typedMembership.payment_id,
        client_id: typedMembership.client_id,
        class_plan_id: typedMembership.class_plan_id,
        amount_paid: typedMembership.amount_paid,
        start_date: todayStr,
        end_date: finalEndDateStr,
        status: 'active',
        remaining_days: 0,
      })

    if (insertError) {
      console.error(insertError)
      return { success: false, error: 'Error al crear la nueva membresía activa.' }
    }

    const { error: updateError } = await supabase
      .from('memberships')
      .update({ status: 'transferred', frozen_days: 0 })
      .eq('id', membershipId)

    if (updateError) {
      console.error(updateError)
      return { success: false, error: 'Error al actualizar el estado de la membresía.' }
    }

    return { success: true, newEndDate: finalEndDateStr }
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
