'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { createClientSchema, updateClientSchema } from './schemas'

export async function saveNewClient(
  clientData: { full_name: string; phone_number?: string; email?: string; registration_source?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    const parsed = createClientSchema.safeParse(clientData)
    if (!parsed.success) {
      return { 
        success: false, 
        error: parsed.error.issues[0]?.message || 'Datos de cliente inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data
    const supabase = await createClient()

    if (clean.email) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', clean.email)
        .maybeSingle()

      if (existingClient) {
        return { 
          success: false, 
          error: 'El correo electrónico ya está registrado con otro cliente.',
          validationErrors: { email: ['El correo electrónico ya está registrado.'] }
        }
      }
    }

    const { error } = await supabase
      .from('clients')
      .insert({
        full_name: clean.full_name,
        phone_number: clean.phone_number,
        email: clean.email,
        registration_source: clean.registration_source
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al registrar cliente: ${msg}` }
  }
}

export async function updateClient(
  clientId: string,
  clientData: { full_name: string; phone_number?: string; email?: string; registration_source?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    const parsed = updateClientSchema.safeParse(clientData)
    if (!parsed.success) {
      return { 
        success: false, 
        error: parsed.error.issues[0]?.message || 'Datos de cliente inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data
    const supabase = await createClient()

    if (clean.email) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', clean.email)
        .neq('id', clientId)
        .maybeSingle()

      if (existingClient) {
        return { 
          success: false, 
          error: 'El correo electrónico ya está registrado con otro cliente.',
          validationErrors: { email: ['El correo electrónico ya está registrado.'] }
        }
      }
    }

    const { error } = await supabase
      .from('clients')
      .update({
        full_name: clean.full_name,
        phone_number: clean.phone_number,
        email: clean.email,
        registration_source: clean.registration_source
      })
      .eq('id', clientId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al actualizar cliente: ${msg}` }
  }
}

export async function deleteClient(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado. Permisos insuficientes.' }
    }

    const supabase = await createClient()

    const { error: membershipsError } = await supabase
      .from('memberships')
      .update({ status: 'cancelled' })
      .eq('client_id', clientId)
      .in('status', ['active', 'frozen'])
    if (membershipsError) throw membershipsError

    const { error: clientError } = await supabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', clientId)
    if (clientError) throw clientError

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar cliente: ${msg}` }
  }
}
