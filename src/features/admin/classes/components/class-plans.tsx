'use client'

import React, { useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/shared'
import { PlanData, ClassData } from '../types'
import { deleteClass, deleteClassPlan } from '../mutations'
import CreateClassModal from './create-class-modal'
import CreatePlanModal from './create-plan-modal'
import { ConfirmDialog, EmptyState, PageHeader, SectionCard, Toast, ToastType, PriceDisplay } from '@/components/shared'

interface ClassPlansProps {
  plans: PlanData[]
  classes: ClassData[]
  onReload?: () => void
  isLoading?: boolean
}

export default function ClassPlans({ plans, classes, onReload, isLoading }: ClassPlansProps) {
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false)
  const [classToEdit, setClassToEdit] = useState<ClassData | null>(null)

  const [createPlanForClass, setCreatePlanForClass] = useState<string | null>(null)
  const [planToEdit, setPlanToEdit] = useState<PlanData | null>(null)

  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null)
  const [planToDelete, setPlanToDelete] = useState<PlanData | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const handleSuccess = () => {
    if (onReload) onReload()
  }

  const confirmDeleteClass = async () => {
    if (!classToDelete) return
    setActionLoading(true)
    const res = await deleteClass(classToDelete.id)
    if (res.success) {
      setToast({ message: 'Clase eliminada.', type: 'success' })
      setClassToDelete(null)
      handleSuccess()
    } else {
      setToast({ message: res.error || 'Error al eliminar.', type: 'error' })
    }
    setActionLoading(false)
  }

  const confirmDeletePlan = async () => {
    if (!planToDelete) return
    setActionLoading(true)
    const res = await deleteClassPlan(planToDelete.id)
    if (res.success) {
      setToast({ message: 'Plan eliminado.', type: 'success' })
      setPlanToDelete(null)
      handleSuccess()
    } else {
      setToast({ message: res.error || 'Error al eliminar.', type: 'error' })
    }
    setActionLoading(false)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <PageHeader
        title="Clases y Planes"
        description="Gestión de clases y planes de pago asociados"
        actions={
          <Button size="default" onClick={() => setIsCreateClassOpen(true)}>
            <Plus className="w-4 h-4" />
            Agregar Clase
          </Button>
        }
      />

      {isLoading && classes.length === 0 ? (
        <div className="py-12 flex justify-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState message="No hay clases registradas." />
      ) : (
        <div className="flex flex-col gap-8 w-full">
          {classes.map((cls) => {
            const classPlans = plans.filter((p) => p.class_id === cls.id)

            return (
              <SectionCard
                key={cls.id}
                title={cls.name}
                description={cls.description || undefined}
                titleAction={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => setClassToEdit(cls)}
                    >
                      Editar Clase
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setCreatePlanForClass(cls.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Plan
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setClassToDelete(cls)}
                      title="Eliminar Clase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                }
              >
                {classPlans.length === 0 ? (
                  <EmptyState message="No hay planes de pago registrados para esta clase." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {classPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-muted/30 border border-border/40 rounded-xl p-4 flex flex-col justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-sm text-foreground">{plan.plan_name}</h4>
                            <PriceDisplay amount={plan.price} variant="primary-badge" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Duración: <strong>{plan.duration_days} días</strong>
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/20 flex justify-end gap-2">
                          <Button
                            variant="neutral"
                            size="sm"
                            onClick={() => setPlanToEdit(plan)}
                          >
                            Editar Plan
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPlanToDelete(plan)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )
          })}
        </div>
      )}

      {isCreateClassOpen && (
        <CreateClassModal
          onClose={() => setIsCreateClassOpen(false)}
          onSuccess={() => {
            setIsCreateClassOpen(false)
            handleSuccess()
          }}
        />
      )}

      {classToEdit && (
        <CreateClassModal
          initialData={classToEdit}
          onClose={() => setClassToEdit(null)}
          onSuccess={() => {
            setClassToEdit(null)
            handleSuccess()
          }}
        />
      )}

      {createPlanForClass && (
        <CreatePlanModal
          defaultClassId={createPlanForClass}
          onClose={() => setCreatePlanForClass(null)}
          onSuccess={() => {
            setCreatePlanForClass(null)
            handleSuccess()
          }}
        />
      )}

      {planToEdit && (
        <CreatePlanModal
          initialData={planToEdit}
          onClose={() => setPlanToEdit(null)}
          onSuccess={() => {
            setPlanToEdit(null)
            handleSuccess()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        onConfirm={confirmDeleteClass}
        title="Eliminar Clase"
        message={`¿Estás seguro que deseas eliminar la clase "${classToDelete?.name}"? También se ocultarán todos los planes de pago asociados.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={confirmDeletePlan}
        title="Eliminar Plan"
        message={`¿Estás seguro que deseas eliminar el plan "${planToDelete?.plan_name}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={actionLoading}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
