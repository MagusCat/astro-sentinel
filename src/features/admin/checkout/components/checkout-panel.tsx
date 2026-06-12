'use client'

import React, { useState } from 'react'
import { AuthenticatedUser } from '@/features/auth/types'
import { ClientData } from '@/features/admin/clients/types'
import { PlanData, ClassData } from '@/features/admin/classes/types'
import { EmptyState, PageHeader, PriceDisplay } from '@/components/shared'
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeClasses.map((cls) => {
          const classPlans = activePlans.filter((p) => p.class_id === cls.id)

          return (
            <div key={cls.id} className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-primary/30 transition-colors duration-300">
              
              {/* Header */}
              <div className="bg-muted/30 p-5 border-b border-border/40 flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-xl">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground font-heading leading-tight">{cls.name}</h4>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cls.description}</p>
                  )}
                </div>
              </div>

              {/* Plans List */}
              <div className="p-4 flex flex-col gap-3">
                <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground ml-1 mb-1">
                  Planes Disponibles
                </p>
                {classPlans.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic text-center py-4">
                    Sin planes asignados
                  </div>
                ) : (
                  classPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanClick(cls, plan)}
                      className="group flex items-center justify-between bg-background border border-border/50 p-4 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                          {plan.plan_name}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          Vigencia de {plan.duration_days} días
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <PriceDisplay amount={plan.price} variant="neutral" />
                        <div className="bg-muted text-muted-foreground p-1.5 rounded-md group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" />
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
