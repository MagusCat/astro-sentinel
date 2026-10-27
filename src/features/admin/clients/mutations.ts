'use server'

import { revalidateTag } from 'next/cache'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { DASHBOARD_CACHE_TAG } from '../dashboard/cache'
import { createClientSchema, updateClientSchema } from './schemas'

export async function saveNewClient(
  clientData: { full_name: string; phone_number?: string; email?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    // Reception, admin and maintainer can all register clients.
    const { supabase } = await requireRole()

    const parsed = createClientSchema.safeParse(clientData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Datos de cliente inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data

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
        email: clean.email
      })

    if (error) throw error

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al registrar cliente.') }
  }
}

export async function updateClient(
  clientId: string,
  clientData: { full_name: string; phone_number?: string; email?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const { supabase } = await requireRole()

    const parsed = updateClientSchema.safeParse(clientData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Datos de cliente inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    const clean = parsed.data

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
        email: clean.email
      })
      .eq('id', clientId)

    if (error) throw error
    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al actualizar cliente.') }
  }
}

export async function deleteClient(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Deleting a client is a higher-privilege action than editing one.
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

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

    revalidateTag(DASHBOARD_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar cliente.') }
  }
}
