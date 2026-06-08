'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, UserPlus, ShoppingCart, Search, AlertCircle, ArrowRight, CreditCard, Activity, RefreshCw } from 'lucide-react'
import { OverviewStats } from '@/features/admin/dashboard/types'
import { DashboardListWidget } from '@/components/shared'
import { ClientData } from '@/features/admin/clients/types'
import { Button } from '@/components/shared'
import { SearchInput } from '@/components/shared'
import { searchClients } from '@/features/admin/clients/queries'
import { useDebounce } from '@/hooks/use-debounce'
import { MembershipStatus } from '@/lib/constants'

interface ReceptionPanelProps {
  stats: OverviewStats
}

export default function ReceptionPanel({ stats }: ReceptionPanelProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ClientData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const handleNavigation = (tab: string) => {
    router.push(`?tab=${tab}`)
  }

  useEffect(() => {
    let isMounted = true
    
    const fetchSearchResults = async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 3) {
        if (isMounted) setSearchResults([])
        return
      }
      
      if (isMounted) setIsSearching(true)
      const results = await searchClients(debouncedSearch)
      if (isMounted) {
        setSearchResults(results)
        setIsSearching(false)
      }
    }
    
    fetchSearchResults()

    return () => { isMounted = false }
  }, [debouncedSearch])

  return (
    <div className="flex flex-col gap-6 w-full h-full flex-1 min-w-0 animate-fade-in-up">
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[330px] max-h-[330px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-foreground tracking-tight">Buscar Cliente</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Busca por nombre, teléfono o correo.</p>
            </div>
          </div>

          <div className="relative">
            <SearchInput
              placeholder="Ingresa el nombre del alumno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 rounded-xl text-base bg-muted/10 focus-visible:bg-background border-2"
              containerClassName="w-full sm:max-w-none"
            />
          </div>
          
          <div className="mt-4 flex flex-col gap-2 flex-1 overflow-y-auto pr-2 rounded-xl border border-border/50 bg-background/50 p-2 shadow-inner">
            {searchTerm.length <= 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground/60 italic flex flex-col items-center justify-center flex-1 min-h-[120px]">
                <Search className="w-6 h-6 mb-2 opacity-80" />
                <span>Escribe al menos 3 letras para buscar</span>
              </div>
            ) : isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground/60 italic flex flex-col items-center justify-center flex-1 min-h-[120px]">
                <RefreshCw className="w-6 h-6 mb-2 animate-spin text-primary" />
                <span>Buscando...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground/60 italic flex flex-col items-center justify-center flex-1 min-h-[120px]">
                <AlertCircle className="w-6 h-6 mb-2 opacity-20" />
                <span>No se encontraron registros.</span>
              </div>
            ) : (
              searchResults.map((client, index) => {
                const hasActivePlan = client.has_active_membership === true

                return (
                  <div key={`${client.id || 'client'}-${index}`} className="flex flex-col sm:flex-row justify-between items-center p-3 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors shadow-sm gap-2">
                    <div className="flex flex-col items-start text-left min-w-0 flex-1 w-full">
                      <p className="font-semibold text-sm text-foreground truncate w-full">{client.full_name}</p>

                      {hasActivePlan && (
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                            <Activity className="w-3 h-3 text-primary" />
                            <span className="font-semibold text-foreground">{client.current_class_name || 'General'}</span> ({client.current_plan_name || 'Plan'})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold tracking-wider border uppercase mt-0.5 ${
                        hasActivePlan 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {hasActivePlan ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          <Button 
            variant="default" 
            className="h-full min-h-[80px] flex items-center justify-start gap-4 rounded-2xl shadow-sm hover:shadow-md transition-all px-6 py-4"
            onClick={() => handleNavigation('checkout')}
          >
            <div className="bg-primary-foreground/20 p-2.5 rounded-xl shrink-0">
              <ShoppingCart className="size-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-base text-primary-foreground leading-tight truncate">Nuevo Pago</span>
              <span className="block text-sm font-normal text-primary-foreground/80 truncate">Cobrar mensualidad</span>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-full min-h-[80px] flex items-center justify-start gap-4 rounded-2xl shadow-sm hover:shadow-md transition-all border-2 px-6 py-4 group"
            onClick={() => handleNavigation('clients')}
          >
            <div className="bg-indigo-500/10 p-2.5 rounded-xl shrink-0 group-hover:bg-indigo-500/20 transition-colors">
              <UserPlus className="size-6 text-indigo-500" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-base text-foreground leading-tight truncate">Nuevo Cliente</span>
              <span className="block text-sm font-normal text-muted-foreground truncate">Inscribir alumno</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        
        <DashboardListWidget
          className="h-full"
          listClassName="h-[250px]"
          title="Membresías Inactivas"
          icon={Clock}
          iconColorClass="text-rose-500"
          items={stats.inactiveMemberships}
          emptyMessage="No hay membresías vencidas"
          renderItem={(membership, idx) => (
            <div key={idx} className="flex flex-row items-center justify-between p-3 border border-border rounded-xl bg-muted/10 hover:bg-muted/30 transition-colors gap-2">
              <div className="flex flex-col items-start justify-between items-center gap-2">
                <span className="text-sm font-bold text-foreground leading-tight truncate" title={membership.clientName}>{membership.clientName}</span>

                                <span className="text-sm text-muted-foreground">
                  Venció: <span className="font-mono">{membership.endDate ? new Date(membership.endDate).toLocaleDateString('es-ES') : 'N/A'}</span>
                </span>

              </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wider border ${
                  membership.status === 'expired' 
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {membership.status === 'expired' ? 'Vencida' : 'Pausada'}
                </span>
            </div>
          )}
        />

        <DashboardListWidget
          className="h-full"
          listClassName="h-[250px]"
          title="Transacciones Recientes"
          icon={CreditCard}
          iconColorClass="text-emerald-500"
          items={stats.recentPayments.slice(0, 6)}
          emptyMessage="Sin registros"
          renderItem={(payment, idx) => (
            <div key={idx} className="flex flex-col gap-1.5 p-3 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm leading-tight font-semibold text-foreground truncate">{payment.clientName}</span>
                <span className="text-sm font-bold font-mono text-emerald-600 bg-emerald-500/10 px-1.5 rounded">${payment.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{payment.paymentMethod}</span>
                <span className="text-xs text-muted-foreground font-mono">{new Date(payment.transactionDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true  })}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
