export interface ClassData {
  id: string
  name: string
  description?: string
  created_at?: string
  is_active?: boolean
}

export interface PlanData {
  id: string
  plan_name: string
  duration_days: number
  price: number
  class_name: string
  class_id?: string
  is_active?: boolean
}

export interface ClassesJoin {
  name: string
}

export interface ClassPlanWithJoin {
  id: string
  class_id: string
  plan_name: string
  duration_days: number
  price: number
  classes: ClassesJoin | null
}

