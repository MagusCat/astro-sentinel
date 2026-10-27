'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { classSchema, classPlanSchema } from './schemas'

export async function saveNewClass(data: { name: string; description?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = classSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { error } = await supabase
      .from('classes')
      .insert({
        name: parsed.data.name,
        description: parsed.data.description
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al crear disciplina.') }
  }
}

export async function saveNewClassPlan(data: { class_id: string; plan_name: string; duration_days: number; price: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = classPlanSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    if (!data.class_id) {
      return { success: false, error: 'Debes seleccionar una disciplina base.' }
    }

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
    return { success: false, error: toActionError(err, 'Error al crear plan de pago.') }
  }
}

export async function deleteClass(class_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', class_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar la clase.') }
  }
}

export async function deleteClassPlan(plan_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { error } = await supabase
      .from('class_plans')
      .update({ is_active: false })
      .eq('id', plan_id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar el plan de pago.') }
  }
}

export async function updateClass(class_id: string, data: { name: string; description?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = classSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

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
    return { success: false, error: toActionError(err, 'Error al actualizar la disciplina.') }
  }
}

export async function updateClassPlan(plan_id: string, data: { plan_name: string; duration_days: number; price: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = classPlanSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

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
    return { success: false, error: toActionError(err, 'Error al actualizar plan de pago.') }
  }
}
