'use client'

import React, { useEffect, useState } from 'react'
import { Banknote, CreditCard, Landmark, Minus, Plus, ShoppingCart, Trash2, User, X } from 'lucide-react'
import { Button, EmptyState, PriceDisplay, SearchInput, TextField, ToggleButtonGroup } from '@/components/shared'
import { ClientData } from '@/features/admin/clients/types'
import { searchClients } from '@/features/admin/clients/queries'
import { useDebounce } from '@/hooks/use-debounce'
import { lineTotal } from '@/lib/format'
import { CartLine, cashChange } from '../utils'

export type PosPaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia'

interface PosCartSummaryProps {
  cart: CartLine[]
  subtotal: number
  total: number
  onQuantity: (line: CartLine, quantity: number) => void
  paymentMethod: PosPaymentMethod
  onPaymentMethod: (method: PosPaymentMethod) => void
  client: Pick<ClientData, 'id' | 'full_name'> | null
  onClient: (client: Pick<ClientData, 'id' | 'full_name'> | null) => void
  canDiscount: boolean
  discountInput: string
  onDiscountInput: (value: string) => void
  loading: boolean
  onConfirm: () => void
}

export default function PosCartSummary(props: PosCartSummaryProps) {
  const { cart, subtotal, total, onQuantity, paymentMethod, onPaymentMethod, loading } = props
  const [received, setReceived] = useState('')
  const change = cashChange(total, Number(received))
  const needsCash = paymentMethod === 'efectivo' && received !== '' && change === null

  // A new cart total invalidates the cash typed for the previous one.
  useEffect(() => { setReceived('') }, [total])

  return (
    <div className="flex flex-col gap-5 h-full">
      <ToggleButtonGroup
        value={paymentMethod}
        onChange={(v) => onPaymentMethod(v as PosPaymentMethod)}
        options={[
          { value: 'efectivo', label: 'Efectivo', icon: <Banknote className="size-4" /> },
          { value: 'tarjeta', label: 'Tarjeta', icon: <CreditCard className="size-4" /> },
          { value: 'transferencia', label: 'Transf.', icon: <Landmark className="size-4" /> },
        ]}
      />

      <ClientPicker client={props.client} onClient={props.onClient} disabled={loading} />

      <ul className="flex-1 flex flex-col gap-2 min-h-[120px] max-h-[340px] overflow-y-auto pr-1" aria-live="polite">
        {cart.length === 0 ? (
          <EmptyState message="Toca un producto o escanea su código." icon={<ShoppingCart className="w-8 h-8" />} />
        ) : cart.map((line) => (
          <li key={line.productId} className="pos-cart-line animate-fade-in-up">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">{line.name}</p>
              <PriceDisplay amount={lineTotal(line.price, line.quantity)} className="text-xs text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="neutral" size="icon-sm" onClick={() => onQuantity(line, line.quantity - 1)} aria-label={`Quitar uno de ${line.name}`} disabled={loading}>
                {line.quantity === 1 ? <Trash2 className="size-4 text-rose-500" /> : <Minus className="size-4" />}
              </Button>
              <span className="w-8 text-center font-bold tabular-nums">{line.quantity}</span>
              <Button variant="neutral" size="icon-sm" onClick={() => onQuantity(line, line.quantity + 1)} aria-label={`Agregar uno de ${line.name}`} disabled={loading || line.quantity >= line.stock}>
                <Plus className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 pt-4 border-t border-border">
        {props.canDiscount && cart.length > 0 && (
          <TextField
            label="Descuento"
            type="number"
            inputMode="decimal"
            min={0}
            max={subtotal}
            step="0.01"
            placeholder="0.00"
            value={props.discountInput}
            onChange={(e) => props.onDiscountInput(e.target.value)}
            disabled={loading}
          />
        )}

        {total !== subtotal && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <PriceDisplay amount={subtotal} />
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <PriceDisplay key={total} amount={total} className="text-2xl font-black animate-pop-in" showSecondary />
        </div>

        {paymentMethod === 'efectivo' && cart.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <TextField
              label="Recibido"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              error={needsCash ? 'No cubre el total' : undefined}
              disabled={loading}
            />
            <Button variant="neutral" onClick={() => setReceived(String(total))} disabled={loading}>Exacto</Button>
            {change !== null && received !== '' && (
              <div className="col-span-2 flex justify-between items-center rounded-xl bg-emerald-500/10 px-4 py-3 animate-fade-in-up">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Vuelto</span>
                <PriceDisplay amount={change} className="text-xl font-black text-emerald-700 dark:text-emerald-400" />
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full py-7 text-lg font-bold shadow-lg"
          disabled={cart.length === 0 || loading || needsCash}
          isLoading={loading}
          onClick={props.onConfirm}
        >
          Cobrar
        </Button>
      </div>
    </div>
  )
}

function ClientPicker({ client, onClient, disabled }: {
  client: Pick<ClientData, 'id' | 'full_name'> | null
  onClient: (client: Pick<ClientData, 'id' | 'full_name'> | null) => void
  disabled: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientData[]>([])
  const debounced = useDebounce(query, 300)

  useEffect(() => {
    let isMounted = true
    if (debounced.trim().length < 2) {
      setResults([])
      return
    }
    searchClients(debounced).then((r) => { if (isMounted) setResults(r.slice(0, 5)) })
    return () => { isMounted = false }
  }, [debounced])

  if (client) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold truncate"><User className="size-4 text-primary shrink-0" /> {client.full_name}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => onClient(null)} aria-label="Quitar cliente" disabled={disabled}><X className="size-4" /></Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <SearchInput
        placeholder="Cliente (opcional, venta anónima por defecto)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        containerClassName="w-full sm:max-w-none"
        disabled={disabled}
      />
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                onClick={() => { onClient({ id: c.id, full_name: c.full_name }); setQuery('') }}
              >
                {c.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
