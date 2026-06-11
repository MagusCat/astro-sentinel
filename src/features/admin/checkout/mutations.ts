'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { unfreezeMembership } from '../memberships/mutations'
import { ProcessCheckoutPayload } from './types'
import { processCheckoutSchema } from './schemas'
import { findActiveMembership } from './queries'
import { calculateMembershipDates } from './utils'
import { MEMBERSHIP_STATUS } from '@/lib/config'

export async function processCheckout(
  payload: ProcessCheckoutPayload
): Promise<{ success: boolean; error?: string; finalEndDate?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    const parsed = processCheckoutSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos de pago inválidos.' }
    }

    const supabase = await createClient()
    const existingMembership = await findActiveMembership(supabase, payload.client_id, payload.class_id)

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        client_id: payload.client_id,
        total_amount: payload.total_amount,
        payment_method: payload.payment_method,
        user_id: currentUser.id
      })
      .select('id')
      .single()

    if (paymentError || !paymentData) {
      console.error(paymentError)
      return { success: false, error: 'Error al registrar el pago en la base de datos.' }
    }

    const paymentId = paymentData.id

    let activeEndDateToAppendTo = existingMembership?.end_date

    if (existingMembership?.status === MEMBERSHIP_STATUS.FROZEN) {
      const unfreezeRes = await unfreezeMembership(existingMembership.id)
      if (!unfreezeRes.success) {
        return { success: false, error: unfreezeRes.error }
      }
      activeEndDateToAppendTo = unfreezeRes.newEndDate
    }

    const { finalStartDateString, finalEndDateString } = calculateMembershipDates(
      payload.duration_days,
      activeEndDateToAppendTo
    )

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        payment_id: paymentId,
        client_id: payload.client_id,
        class_plan_id: payload.class_plan_id,
        amount_paid: payload.total_amount,
        start_date: finalStartDateString,
        end_date: finalEndDateString,
        status: MEMBERSHIP_STATUS.ACTIVE
      })

    if (membershipError) {
      console.error(membershipError)
      return { success: false, error: 'El pago se registró, pero ocurrió un error al crear la nueva membresía.' }
    }

    return { success: true, finalEndDate: finalEndDateString }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al procesar checkout: ${msg}` }
  }
}
