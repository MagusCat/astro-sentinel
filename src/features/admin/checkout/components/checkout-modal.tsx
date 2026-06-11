'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Toast, ToastType, SearchInput } from '@/components/shared'
import { Button } from '@/components/shared'
import { AuthenticatedUser } from '@/features/auth/types'
import { ClientData } from '@/features/admin/clients/types'
import { PlanData, ClassData } from '@/features/admin/classes/types'
import { searchClients } from '@/features/admin/clients/queries'
import { checkClientMembership } from '../queries'
import { processCheckout } from '../mutations'
import { useDebounce } from '@/hooks/use-debounce'
import { MEMBERSHIP_STATUS } from '@/lib/config'
import { CheckCircle2, Download, CreditCard, User, Info, Zap } from 'lucide-react'

interface CheckoutModalProps {
  selectedClass: ClassData
  selectedPlan: PlanData
  clients: ClientData[]
  activeUser: AuthenticatedUser
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' }
]

export default function CheckoutModal({
  selectedClass,
  selectedPlan,
  clients,
  onClose,
  onSuccess
}: CheckoutModalProps) {
  const [clientId, setClientId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState<string>('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<ClientData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const debouncedSearch = useDebounce(clientSearch, 300)

  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  const [isSuccess, setIsSuccess] = useState(false)
  const [finalEndDateStr, setFinalEndDateStr] = useState<string>('')

  const [existingMembership, setExistingMembership] = useState<{ endDate: string; status: string } | null>(null)
  const [checkingMembership, setCheckingMembership] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setExistingMembership(null)
      return
    }

    let isMounted = true
    const verify = async () => {
      setCheckingMembership(true)
      const res = await checkClientMembership(clientId, selectedClass.id)
      if (isMounted) {
        if (res.hasMembership && res.endDate) {
          setExistingMembership({ endDate: res.endDate, status: res.status || MEMBERSHIP_STATUS.ACTIVE })
        } else {
          setExistingMembership(null)
        }
        setCheckingMembership(false)
      }
    }
    verify()

    return () => { isMounted = false }
  }, [clientId, selectedClass.id])

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
    
    // Only search if we haven't just selected a client
    if (!clientId) {
      fetchSearchResults()
    } else {
      setSearchResults([])
      setIsSearching(false)
    }

    return () => { isMounted = false }
  }, [debouncedSearch, clientId])

  const handleProcess = async () => {
    if (!clientId) {
      setToast({ message: 'Selecciona un cliente para el pago.', type: 'error' })
      return
    }
    
    setLoading(true)
    const res = await processCheckout({
      client_id: clientId,
      class_plan_id: selectedPlan.id,
      class_id: selectedClass.id,
      payment_method: paymentMethod,
      total_amount: selectedPlan.price,
      duration_days: selectedPlan.duration_days
    })
    
    setLoading(false)

    if (res.success && res.finalEndDate) {
      setFinalEndDateStr(res.finalEndDate)
      setToast({ message: 'Pago procesado exitosamente', type: 'success' })
      setIsSuccess(true)
      onSuccess() // Trigger parent to reload database in background
    } else {
      setToast({ message: res.error || 'Error al procesar el pago', type: 'error' })
    }
  }

  if (isSuccess) {
    const selectedClient = clients.find(c => c.id === clientId)
    const today = new Date()
    
    const [year, month, day] = finalEndDateStr.split('-').map(Number)
    const endDate = new Date(year, month - 1, day)

    return (
      <>
      <Modal isOpen={true} onClose={onClose} title="Ticket de Compra" size="lg">
        <div className="flex flex-col items-center p-4">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">¡Pago Procesado!</h2>
          <p className="text-sm text-muted-foreground mb-6">Membresía activada exitosamente</p>
          
          {/* TICKET CARD */}
          <div className="w-full bg-muted/30 border border-border/50 rounded-xl p-5 flex flex-col gap-3 font-mono text-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            
            <div className="flex justify-between items-center border-b border-border/50 pb-3 mb-1">
              <span className="text-muted-foreground uppercase text-sm font-bold tracking-wider">Concepto</span>
              <span className="font-semibold text-right">{selectedClass.name} - {selectedPlan.plan_name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-semibold">{selectedClient?.full_name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Vigencia</span>
              <span className="font-semibold">{selectedPlan.duration_days} días</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground/80 mt-1">
              <span>{today.toLocaleDateString('es-ES')}</span>
              <span>al</span>
              <span>{endDate.toLocaleDateString('es-ES')}</span>
            </div>

            <div className="flex justify-between items-center border-t border-border/50 pt-3 mt-1">
              <span className="text-muted-foreground uppercase text-sm font-bold tracking-wider">Total Pagado</span>
              <span className="font-bold text-lg text-primary">${selectedPlan.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-end mt-[-8px]">
              <span className="text-sm uppercase text-muted-foreground">Método: {paymentMethod}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full mt-8">
            <Button variant="neutral" className="flex-1" onClick={onClose}>
              Cerrar
            </Button>
            <Button className="flex-1" disabled title="Próximamente">
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </Modal>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </>
    )
  }

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Procesar Nuevo Pago" size="lg">
        <div className="flex flex-col gap-6">
          
          {/* Summary Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col gap-2">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Resumen de Compra</h4>
            <div className="flex justify-between items-center mt-1">
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-lg">{selectedClass.name}</span>
                <span className="text-sm text-muted-foreground font-medium">{selectedPlan.plan_name} ({selectedPlan.duration_days} días)</span>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-2xl font-extrabold text-foreground font-mono">${selectedPlan.price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">Monto Total</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" />
                Seleccionar Cliente
              </label>
              <div className="relative">
                <SearchInput
                  placeholder="Escribe el nombre o correo del cliente..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setClientId('') // Reset selected client if they type
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  disabled={loading}
                  containerClassName="w-full sm:max-w-none"
                  className="w-full text-sm pl-10 pr-4 py-3"
                />
                {showDropdown && clientSearch.trim().length >= 3 && !clientId && (
                  <div className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto bg-card border border-border/60 rounded-md shadow-xl">
                    {isSearching ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span>Buscando clientes...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((c, index) => (
                        <div
                          key={`${c.id || 'client'}-${index}`}
                          className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors text-sm text-foreground"
                          onClick={() => {
                            setClientId(c.id)
                            setClientSearch(c.full_name)
                            setShowDropdown(false)
                          }}
                        >
                          <div className="font-semibold">{c.full_name}</div>
                          {c.email && <div className="text-sm text-muted-foreground mt-0.5">{c.email}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-muted-foreground italic text-center">
                        No se encontraron clientes con &quot;{clientSearch}&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    disabled={loading}
                    className={`text-sm py-3 px-2 rounded-md font-medium transition-all border ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {existingMembership && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 animate-fade-in-up mt-2">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                    {existingMembership.status === MEMBERSHIP_STATUS.FROZEN ? 'Membresía Pausada Detectada' : 'Membresía Activa Detectada'}
                  </span>
                  <span className="text-sm text-amber-800 mt-1 leading-relaxed">
                    Este cliente tiene una membresía vigente hasta el <strong className="text-amber-900">{new Date(existingMembership.endDate + 'T00:00:00').toLocaleDateString('es-ES')}</strong>.
                    El nuevo plan se programará de forma consecutiva.{' '}
                    {existingMembership.status === MEMBERSHIP_STATUS.FROZEN && (
                      <span className="font-semibold block mt-2 text-foreground bg-muted border border-border/50 p-2 rounded flex items-start gap-2">
                        <Zap className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        Al confirmar, su cuenta será reactivada de forma forzada.
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="neutral" onClick={onClose} disabled={loading || checkingMembership}>
              Cancelar
            </Button>
            <Button onClick={handleProcess} disabled={loading || checkingMembership}>
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
