'use client'

import React, { useState } from 'react'
import { AuthenticatedUser } from '@/features/auth/types'
import { ClientData } from '@/features/admin/clients/types'
import { PlanData, ClassData } from '@/features/admin/classes/types'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { PageHeader } from '@/components/shared/layout/page-header'
import { PriceDisplay } from '@/components/shared/data-display/price-display'
import { Dumbbell, Calendar, ChevronRight } from 'lucide-react'
import CheckoutModal from './checkout-modal'

interface CheckoutPanelProps {
  classes: ClassData[]
  plans: PlanData[]
  clients: ClientData[]
  activeUser: AuthenticatedUser
  onReload: () => void
}

export default function CheckoutPanel({ classes, plans, clients, activeUser, onReload }: CheckoutPanelProps) {
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null)

  const activeClasses = classes || []
  const activePlans = plans || []

  const handlePlanClick = (cls: ClassData, plan: PlanData) => {
    setSelectedClass(cls)
    setSelectedPlan(plan)
  }

  const handleCloseModal = () => {
    setSelectedClass(null)
    setSelectedPlan(null)
  }

  if (activeClasses.length === 0 || activePlans.length === 0) {
    return (
      <div className="bg-card border border-border/40 p-6 rounded-xl shadow-sm w-full">
        <EmptyState message="No hay disciplinas o planes configurados. Ve a 'Gestión de Planes' para crear opciones de compra." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      <PageHeader
        title="Catálogo de Planes"
        description="Selecciona el plan que el cliente desea adquirir para proceder con el cobro."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {activeClasses.map((cls) => {
          const classPlans = activePlans.filter((p) => p.class_id === cls.id)

          return (
            <div key={cls.id} className="bg-card border border-border/40 rounded-[2rem] shadow-sm overflow-hidden flex flex-col hover:border-primary/20 hover:shadow-xl transition-all duration-700 ease-[var(--ease-haptic)]">
              
              {/* Header */}
              <div className="bg-muted/30 p-5 border-b border-border/10 flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-xl border border-primary/5">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-lg text-foreground leading-tight truncate">{cls.name}</h4>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{cls.description}</p>
                  )}
                </div>
              </div>

              {/* Plans List */}
              <div className="p-6 flex flex-col gap-4">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50 ml-1 mb-2">
                  Planes de Inscripción
                </p>
                {classPlans.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic text-center py-6 bg-muted/5 rounded-2xl border border-dashed border-border/40">
                    Sin planes asignados
                  </div>
                ) : (
                  classPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanClick(cls, plan)}
                      className="group flex items-center justify-between bg-background border border-border/60 p-5 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all duration-500 ease-[var(--ease-haptic)] text-left cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex flex-col gap-1.5 min-w-0 pr-2">
                        <span className="font-extrabold text-foreground text-sm uppercase tracking-tight group-hover:text-primary transition-colors">
                          {plan.plan_name}
                        </span>
                        <div className="inline-flex items-center text-[11px] font-bold text-muted-foreground/80 gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {plan.duration_days} Días de vigencia
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <PriceDisplay amount={plan.price} variant="neutral" />
                        <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground p-2 rounded-xl transition-all duration-500">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>


      {selectedClass && selectedPlan && (
        <CheckoutModal
          selectedClass={selectedClass}
          selectedPlan={selectedPlan}
          clients={clients}
          activeUser={activeUser}
          onClose={handleCloseModal}
          onSuccess={() => {
            onReload()
          }}
        />
      )}
    </div>
  )
}
