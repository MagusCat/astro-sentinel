'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Coins, Lock, RefreshCw } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingState,
  SectionCard,
  SelectField,
  StatusBadge,
  TextField,
  Toast,
  ToastType,
  WarningAlert,
} from '@/components/shared'
import { Roles } from '@/lib/auth/roles'
import { AuthenticatedUser } from '@/features/auth/types'
import { CurrencyAdminData, CurrencyRow } from '../types'
import {
  getCurrencyAdminData,
  setSecondaryCurrency,
  setExchangeRate,
  setBaseCurrency,
  upsertCurrency,
} from '../actions'

interface CurrencySettingsProps {
  activeUser: AuthenticatedUser
}

export default function CurrencySettings({ activeUser }: CurrencySettingsProps) {
  const [data, setData] = useState<CurrencyAdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const [rateInput, setRateInput] = useState('')
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', locale: '' })
  const [baseChange, setBaseChange] = useState({ code: '', rate: '' })
  const [confirmBase, setConfirmBase] = useState(false)

  const isMaintainer = Roles.canAccessDeveloper(activeUser.role)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getCurrencyAdminData()
    if (res.success && res.data) {
      setData(res.data)
      setRateInput(res.data.secondaryRate ? String(res.data.secondaryRate.toFixed(4)) : '')
    } else {
      setToast({ message: res.error || 'Error al cargar la configuración.', type: 'error' })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setSaving(true)
    const res = await fn()
    setSaving(false)
    setToast({ message: res.success ? okMsg : res.error || 'Error', type: res.success ? 'success' : 'error' })
    if (res.success) await load()
  }

  if (loading) return <LoadingState text="Cargando configuración de moneda..." />
  if (!data) return <EmptyState message="No se pudo cargar la configuración de moneda." />

  const base = data.currencies.find((c) => c.is_base)
  const secondary = data.currencies.find((c) => c.is_secondary)
  const selectable = data.currencies.filter((c) => !c.is_base)

  const columns = [
    {
      key: 'code',
      header: 'Moneda',
      render: (c: CurrencyRow) => (
        <div className="flex flex-col">
          <span className="font-bold font-mono">{c.code}</span>
          <span className="text-xs text-muted-foreground">{c.name}</span>
        </div>
      ),
    },
    { key: 'symbol', header: 'Símbolo', render: (c: CurrencyRow) => <span className="font-mono">{c.symbol || '—'}</span> },
    { key: 'locale', header: 'Locale', render: (c: CurrencyRow) => <span className="font-mono text-xs">{c.locale}</span> },
    {
      key: 'role',
      header: 'Rol',
      render: (c: CurrencyRow) =>
        c.is_base ? (
          <StatusBadge status="success" />
        ) : c.is_secondary ? (
          <StatusBadge status="pending" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 w-full h-full flex-1 min-w-0">
      <SectionCard
        title="Moneda dominante"
        description={`Los precios se guardan y se capturan en ${base?.code ?? '—'}. Es la moneda de referencia de todo el sistema.`}
        titleAction={
          <Button variant="neutral" size="sm" onClick={load} disabled={saving}>
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <Coins className="w-8 h-8 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-foreground">{base?.code ?? '—'}</span>
              <span className="text-xs text-muted-foreground">
                {base?.name} · formato {base?.locale}
              </span>
            </div>
          </div>

          {!data.canChangeBase ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">Moneda base bloqueada. </span>
                {data.lockedReason} Cambiarla requiere una migración contable con conversión
                del histórico, no un ajuste desde esta pantalla.
              </p>
            </div>
          ) : !isMaintainer ? (
            <p className="text-xs text-muted-foreground">
              Solo un Programador (Maintainer) puede cambiar la moneda base.
            </p>
          ) : (
            <div className="flex flex-col gap-4 p-4 rounded-2xl border border-dashed border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aún no hay histórico financiero, así que la base puede cambiarse. Los precios del
                catálogo se convertirán con la tasa indicada.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <SelectField
                    label="Nueva moneda base"
                    value={baseChange.code}
                    onChange={(e) => setBaseChange((p) => ({ ...p, code: e.target.value }))}
                    options={[
                      { label: 'Seleccionar...', value: '' },
                      ...selectable.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <TextField
                    label={`Unidades nuevas por 1 ${base?.code ?? 'base'}`}
                    type="number"
                    value={baseChange.rate}
                    onChange={(e) => setBaseChange((p) => ({ ...p, rate: e.target.value }))}
                    placeholder="36.80"
                  />
                </div>
              </div>
              <Button
                variant="destructive"
                disabled={!baseChange.code || !baseChange.rate || saving}
                onClick={() => setConfirmBase(true)}
              >
                Cambiar moneda base
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Moneda secundaria"
        description="Se muestra junto a la base en los totales de cobro. Opcional."
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SelectField
                label="Mostrar también en"
                value={secondary?.code ?? ''}
                onChange={(e) => run(() => setSecondaryCurrency(e.target.value || null), 'Moneda secundaria actualizada.')}
                options={[
                  { label: 'Ninguna (solo moneda base)', value: '' },
                  ...selectable.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
                ]}
              />
            </div>

            {secondary && (
              <div className="flex-1 flex items-end gap-3">
                <div className="flex-1">
                  <TextField
                    label={`${secondary.code} por 1 ${base?.code ?? 'base'}`}
                    type="number"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="36.80"
                  />
                </div>
                <Button
                  disabled={!rateInput || saving}
                  onClick={() =>
                    run(
                      () => setExchangeRate({ code: secondary.code, unitsPerBase: Number(rateInput) }),
                      'Tasa de cambio actualizada.'
                    )
                  }
                >
                  Guardar tasa
                </Button>
              </div>
            )}
          </div>

          {secondary && data.secondaryRate === null && (
            <WarningAlert
              variant="warning"
              title="Sin tasa de cambio"
              message={`${secondary.code} está seleccionada como secundaria pero no tiene tasa cargada. Los importes se muestran solo en ${base?.code}.`}
            />
          )}

          <p className="text-[11px] text-muted-foreground">
            Cada cambio de tasa se guarda como un registro nuevo: el histórico se conserva para
            que cada pago mantenga la tasa con la que se cobró.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Monedas registradas" description="Catálogo de monedas disponibles en el sistema.">
        <div className="flex flex-col gap-6">
          <DataTable
            data={data.currencies}
            keyExtractor={(c) => c.code}
            columns={columns}
            emptyState={<EmptyState message="No hay monedas registradas." />}
          />

          <div className="flex flex-col gap-4 p-4 rounded-2xl border border-dashed border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Agregar o actualizar moneda
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <TextField
                label="Código ISO"
                value={newCurrency.code}
                onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value }))}
                placeholder="EUR"
              />
              <TextField
                label="Nombre"
                value={newCurrency.name}
                onChange={(e) => setNewCurrency((p) => ({ ...p, name: e.target.value }))}
                placeholder="Euro"
              />
              <TextField
                label="Símbolo"
                value={newCurrency.symbol}
                onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))}
                placeholder="€"
              />
              <TextField
                label="Locale"
                value={newCurrency.locale}
                onChange={(e) => setNewCurrency((p) => ({ ...p, locale: e.target.value }))}
                placeholder="es-ES"
              />
            </div>
            <Button
              variant="neutral"
              disabled={saving || !newCurrency.code || !newCurrency.name || !newCurrency.locale}
              onClick={() =>
                run(async () => {
                  const res = await upsertCurrency(newCurrency)
                  if (res.success) setNewCurrency({ code: '', name: '', symbol: '', locale: '' })
                  return res
                }, 'Moneda guardada.')
              }
            >
              Guardar moneda
            </Button>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={confirmBase}
        onClose={() => setConfirmBase(false)}
        onConfirm={async () => {
          setConfirmBase(false)
          await run(
            () => setBaseCurrency({ code: baseChange.code, conversionRate: Number(baseChange.rate) }),
            'Moneda base actualizada y precios convertidos.'
          )
          setBaseChange({ code: '', rate: '' })
        }}
        title="Cambiar la moneda base"
        message={`Todos los precios del catálogo se multiplicarán por ${baseChange.rate} y pasarán a estar expresados en ${baseChange.code}. Esta operación no se puede deshacer automáticamente.`}
        variant="danger"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
