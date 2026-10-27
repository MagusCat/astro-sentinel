'use server'

import { revalidateTag } from 'next/cache'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { DASHBOARD_CACHE_TAG } from '../dashboard/cache'
import { ProcessCheckoutPayload } from './types'
import { processCheckoutSchema } from './schemas'

/**
 * Processes a membership sale in a single database transaction.
 *
 * Price and duration are read from `class_plans` inside the RPC — the client
 * only sends identifiers, never the amount to charge. Payment + membership are
 * inserted atomically, so a failure can no longer leave an orphaned payment.
 */
export async function processCheckout(
  payload: ProcessCheckoutPayload
): Promise<{ success: boolean; error?: string; finalEndDate?: string; payment_id?: string; amount_charged?: number }> {
  try {
    const { user: currentUser, supabase } = await requireRole()

    const parsed = processCheckoutSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos de pago inválidos.' }
    }

    const { data, error } = await supabase.rpc('process_membership_checkout', {
      p_client_id: parsed.data.client_id,
      p_class_plan_id: parsed.data.class_plan_id,
      p_user_id: currentUser.id,
      p_payment_method: parsed.data.payment_method,
      p_discount: parsed.data.discount,
    })

    if (error) throw error

    revalidateTag(DASHBOARD_CACHE_TAG)

    const result = data as { payment_id: string; end_date: string; amount_charged: number } | null
    return {
      success: true,
      payment_id: result?.payment_id,
      finalEndDate: result?.end_date,
      amount_charged: result ? Number(result.amount_charged) : undefined,
    }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al procesar checkout.') }
  }
}
