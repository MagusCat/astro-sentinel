'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { classSchema, classPlanSchema } from './schemas'

export async function saveNewClass(data: { name: string; description?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const parsed = classSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('classes')
      .insert({
        name: parsed.data.name,
        description: parsed.data.description
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al crear disciplina: ${msg}` }
  }
}

export async function saveNewClassPlan(data: { class_id: string; plan_name: string; duration_days: number; price: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const parsed = classPlanSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    if (!data.class_id) {
      return { success: false, error: 'Debes seleccionar una disciplina base.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('class_plans')
      .insert({
        class_id: data.class_id,
        plan_name: parsed.data.plan_name,
        duration_days: parsed.data.duration_days,
        price: parsed.data.price
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al crear plan de pago: ${msg}` }
  }
}

export async function deleteClass(class_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', class_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar la clase: ${msg}` }
  }
}

export async function deleteClassPlan(plan_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('class_plans')
      .update({ is_active: false })
      .eq('id', plan_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar el plan de pago: ${msg}` }
  }
}

export async function updateClass(class_id: string, data: { name: string; description?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const parsed = classSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('classes')
      .update({
        name: parsed.data.name,
        description: parsed.data.description
      })
      .eq('id', class_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al actualizar la disciplina: ${msg}` }
  }
}

export async function updateClassPlan(plan_id: string, data: { plan_name: string; duration_days: number; price: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canManageStaff(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos insuficientes.' }
    }

    const parsed = classPlanSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('class_plans')
      .update({
        plan_name: parsed.data.plan_name,
        duration_days: parsed.data.duration_days,
        price: parsed.data.price
      })
      .eq('id', plan_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al actualizar plan de pago: ${msg}` }
  }
}
