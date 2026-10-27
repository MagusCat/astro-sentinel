'use server'

import { revalidateTag } from 'next/cache'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { DASHBOARD_CACHE_TAG } from '../dashboard/cache'
import { APP_ROLE } from '@/lib/config/domain'
import { createPaymentSchema, voidPaymentSchema } from './schemas'

export async function saveNewPayment(
  paymentData: { client_id: string; total_amount: number; payment_method: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    // Free-amount entry bypasses plan/product pricing, so only managers may use it.
    const { user: currentUser, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = createPaymentSchema.safeParse(paymentData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Datos de pago inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data

    const { data: clientObj } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clean.client_id)
      .maybeSingle()

    if (!clientObj) {
      return {
        success: false,
        error: 'El cliente seleccionado no existe en el sistema.',
        validationErrors: { client_id: ['El cliente seleccionado no es válido.'] }
      }
    }

    const { error } = await supabase
      .from('payments')
      .insert({
        client_id: clean.client_id,
        total_amount: clean.total_amount,
        payment_method: clean.payment_method,
        user_id: currentUser.id,
        processed_by: currentUser.id,
        category: 'MEMBERSHIP'
      })

    if (error) throw error

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al registrar pago.') }
  }
}

/**
 * Voids a payment atomically in SQL: cancels the membership it paid for, returns
 * sold stock as a RETURN movement and stops counting it as revenue. Nothing is deleted.
 */
export async function voidPayment(input: { payment_id: string; reason: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = voidPaymentSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }

    const { error } = await supabase.rpc('void_payment', {
      p_payment_id: parsed.data.payment_id,
      p_user_id: user.id,
      p_reason: parsed.data.reason,
    })
    if (error) throw error

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al anular el pago.') }
  }
}
