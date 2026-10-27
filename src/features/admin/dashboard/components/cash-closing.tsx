'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Ban, Printer, Receipt, TicketPercent, Wallet } from 'lucide-react'
import { Button, EmptyState, MetricCard, PriceDisplay, SectionCard, Skeleton, TextField, ToggleButtonGroup, WarningAlert } from '@/components/shared'
import { addDays, todayStr } from '@/lib/dates'
import { CashBreakdown, CashClosingData, getCashClosing } from '../reports-actions'

const METHOD_LABELS: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }
const CATEGORY_LABELS: Record<string, string> = { MEMBERSHIP: 'Membresías', PRODUCT: 'Tienda' }

function presetRange(preset: string): { from: string; to: string } {
  const today = todayStr()
  if (preset === 'yesterday') return { from: addDays(today, -1), to: addDays(today, -1) }
  if (preset === 'week') return { from: addDays(today, -6), to: today }
  return { from: today, to: today }
}

/**
 * Cierre de caja: lo cobrado por método, por operador y por categoría, más las
 * anulaciones y descuentos del periodo. Todas las sumas vienen de SQL.
 */
export default function CashClosing() {
  const [preset, setPreset] = useState('today')
  const [range, setRange] = useState(presetRange('today'))
  const [data, setData] = useState<CashClosingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getCashClosing(range.from, range.to)
    setError(res.success ? null : res.error || 'No se pudo cargar el cierre.')
    setData(res.data ?? null)
    setLoading(false)
  }, [range])

  useEffect(() => { load() }, [load])

  const choosePreset = (value: string) => {
    setPreset(value)
    if (value !== 'custom') setRange(presetRange(value))
  }

  const singleDay = range.from === range.to

  return (
    <SectionCard
      title="Cierre de caja"
      description={singleDay ? `Movimientos del ${range.from}` : `Del ${range.from} al ${range.to}`}
      titleAction={
        <Button size="sm" variant="neutral" className="gap-2 print:hidden" disabled={!data} onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      }
    >
      <div className="print-area flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 print:hidden">
          <ToggleButtonGroup
            value={preset}
            onChange={choosePreset}
            options={[
              { value: 'today', label: 'Hoy' },
              { value: 'yesterday', label: 'Ayer' },
              { value: 'week', label: '7 días' },
              { value: 'custom', label: 'Rango' },
            ]}
          />
          {preset === 'custom' && (
            <div className="flex gap-2">
              <TextField label="Desde" type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
              <TextField label="Hasta" type="date" value={range.to} min={range.from} max={todayStr()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
            </div>
          )}
        </div>

        {error && <WarningAlert title="No se pudo cargar" message={error} variant="error" />}

        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : data && (
          <div className="flex flex-col gap-6 stagger-children">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard title="Cobrado (neto)" value={<PriceDisplay amount={data.net} showSecondary />} icon={Wallet} color="emerald" variant="highlight" />
              <MetricCard title="Operaciones" value={data.count} icon={Receipt} color="blue" />
              <MetricCard title="Descuentos otorgados" value={<PriceDisplay amount={data.discounts} />} icon={TicketPercent} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BreakdownList title="Por método de pago" rows={data.by_method} labels={METHOD_LABELS} />
              <BreakdownList title="Por operador" rows={data.by_staff} />
              <BreakdownList title="Por categoría" rows={data.by_category} labels={CATEGORY_LABELS} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><Ban className="size-4 text-rose-500" /> Anulaciones ({data.voided.length})</h4>
                {data.voided.length === 0 ? (
                  <EmptyState message="Sin anulaciones en el periodo." />
                ) : (
                  <ul className="flex flex-col divide-y divide-border/50">
                    {data.voided.map((v) => (
                      <li key={v.id} className="py-2 flex justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{v.client_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{v.void_reason} · por {v.voided_by}</p>
                        </div>
                        <PriceDisplay amount={v.total} className="line-through opacity-60 shrink-0" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><TicketPercent className="size-4 text-amber-500" /> Descuentos ({data.discounted.length})</h4>
                {data.discounted.length === 0 ? (
                  <EmptyState message="Sin descuentos en el periodo." />
                ) : (
                  <ul className="flex flex-col divide-y divide-border/50">
                    {data.discounted.map((d) => (
                      <li key={d.id} className="py-2 flex justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{d.client_name}</p>
                          <p className="text-xs text-muted-foreground truncate">autorizó {d.user_name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">−<PriceDisplay amount={d.discount} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function BreakdownList({ title, rows, labels = {} }: { title: string; rows: CashBreakdown[]; labels?: Record<string, string> }) {
  const total = rows.reduce((max, r) => Math.max(max, r.total), 0) || 1
  return (
    <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-3">
      <h4 className="text-sm font-bold">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Sin movimientos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-col gap-1" title={`${labels[r.label] ?? r.label}: ${r.count} operaciones`}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{labels[r.label] ?? r.label} <span className="text-muted-foreground">· {r.count}</span></span>
                <PriceDisplay amount={r.total} className="font-semibold shrink-0" />
              </div>
              {/* Single-series magnitude bar; the value is the text above, so no legend is needed. */}
              <div className="h-1.5 rounded-full bg-muted/60" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${(r.total / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
