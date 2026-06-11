'use server'

import { createClient } from '@/lib/supabase/server'
import { PlanData, ClassData, ClassPlanWithJoin } from './types'

export async function getClassPlans(): Promise<PlanData[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('class_plans')
      .select(`id, class_id, plan_name, duration_days, price, classes ( name )`)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw error

    // Supabase returns `classes` as an array due to the join, but we know it's a single row
    return ((data || []) as unknown as ClassPlanWithJoin[]).map((p) => ({
      id: p.id,
      plan_name: p.plan_name,
      duration_days: p.duration_days,
      price: Number(p.price),
      class_name: p.classes?.name || 'General',
      class_id: p.class_id
    }))
  } catch (err) {
    console.error('Error fetching class plans:', err)
    return []
  }
}

export async function getClassesList(): Promise<{ success: boolean; classes?: ClassData[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, description, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, classes: data as ClassData[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al obtener disciplinas: ${msg}` }
  }
}
