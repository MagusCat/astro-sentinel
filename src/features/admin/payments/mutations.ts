'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { createPaymentSchema } from './schemas'

export async function saveNewPayment(
  paymentData: { client_id: string; total_amount: number; payment_method: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    const parsed = createPaymentSchema.safeParse(paymentData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Datos de pago inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data
    const supabase = await createClient()

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
        user_id: currentUser.id
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al registrar pago: ${msg}` }
  }
}
