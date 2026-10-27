'use client'

import React, { useState } from 'react'
import { Plus, RefreshCw, Trash2, Calendar, Edit2, Settings2 } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState, PageHeader, PriceDisplay, SectionCard, Toast, ToastType } from '@/components/shared';

import { PlanData, ClassData } from '../types'
import { deleteClass, deleteClassPlan } from '../mutations'
import CreateClassModal from './create-class-modal'
import CreatePlanModal from './create-plan-modal'

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
    <div className="w-full flex flex-col gap-6 h-full flex-1 min-w-0">
      <PageHeader
        title="Clases y Planes"
        description="Gestión de clases y planes de pago asociados"
        actions={
          <Button size="default" onClick={() => setIsCreateClassOpen(true)} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" />
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 w-full items-stretch">
          {classes.map((cls) => {
            const classPlans = plans.filter((p) => p.class_id === cls.id)

            return (
              <div key={cls.id} className="w-full flex flex-col h-full @container/class">
                <SectionCard
                  title={cls.name}
                  description={cls.description || undefined}
                  className="border-none shadow-none bg-transparent hover:border-none hover:shadow-none p-0 w-full flex-1 flex flex-col h-full"
                  headerClassName="flex flex-col lg:flex-row justify-between items-start gap-8 px-6 w-full mb-8"
                  titleAction={
                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
                      <Button
                        variant="neutral"
                        size="default"
                        onClick={() => setClassToEdit(cls)}
                        className="flex-1 lg:flex-none rounded-2xl px-5 h-12 font-black text-[11px] uppercase tracking-[0.15em] shadow-sm bg-card border-border/60 hover:bg-muted"
                      >
                        <Edit2 className="w-4 h-4 mr-2 opacity-70" />
                        Editar Clase
                      </Button>
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => setCreatePlanForClass(cls.id)}
                        className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-black text-[11px] uppercase tracking-[0.15em] shadow-md shadow-primary/20"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Plan
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setClassToDelete(cls)}
                        title="Eliminar Clase"
                        className="rounded-2xl w-12 h-12 shrink-0 shadow-md shadow-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  }
                >
                  <div className="flex-1 h-full">
                    {classPlans.length === 0 ? (
                      <div className="p-8 mx-6 bg-muted/10 rounded-[2.5rem] border border-dashed border-border/40 flex items-center justify-center">
                        <EmptyState message="No hay planes configurados para esta disciplina" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-2 px-2">
                        {classPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="group/plan w-full bg-card border border-border/50 rounded-[2.5rem] p-7 flex flex-col justify-between hover:border-primary/30 transition-all duration-700 ease-[var(--ease-haptic)] min-h-[160px]"
                          >
                            <div className="flex flex-col gap-4">
                              <h4 className="font-black text-sm text-foreground uppercase tracking-tight leading-tight break-words text-left">
                                {plan.plan_name}
                              </h4>
                              
                              <div className="flex items-center justify-start gap-8 py-1">
                                <div className="flex flex-col items-start">
                                  <div className="flex items-center gap-1.5 text-primary">
                                    <Calendar className="w-4 h-4 opacity-70" />
                                    <span className="text-base font-black tracking-tight leading-none">{plan.duration_days}</span>
                                  </div>
                                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.15em] mt-0.5">Días</span>
                                </div>
                                
                                <div className="w-px h-6 bg-border/40" />

                                <div className="flex flex-col items-start">
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <PriceDisplay amount={plan.price} variant="neutral" className="text-base p-0 border-none bg-transparent font-black leading-none" />
                                  </div>
                                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.15em] mt-0.5">Inversión</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-border/10 flex flex-row gap-3 items-center">
                              <Button
                                variant="neutral"
                                size="default"
                                className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-border/40 bg-card hover:bg-muted shadow-none"
                                onClick={() => setPlanToEdit(plan)}
                              >
                                <Settings2 className="w-3.5 h-3.5 mr-2 opacity-70" />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="w-12 h-12 rounded-xl shrink-0 shadow-none"
                                onClick={() => setPlanToDelete(plan)}
                                title="Borrar Plan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
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
