'use client'

import React, { useEffect, useState } from 'react'
import { BellRing, MessageCircle } from 'lucide-react'
import { DashboardListWidget } from '@/components/shared'
import { cn } from '@/lib/utils'
import { getRenewalReminders } from '../queries'
import { ReminderRow } from '../types'
import { reminderMessage, whatsappLink } from '../utils'

function dueLabel(daysLeft: number): string {
  if (daysLeft < 0) return `venció hace ${-daysLeft} d`
  return daysLeft === 0 ? 'vence hoy' : `vence en ${daysLeft} d`
}

export default function RemindersWidget() {
  const [rows, setRows] = useState<ReminderRow[]>([])

  useEffect(() => {
    let isMounted = true
    getRenewalReminders().then((data) => { if (isMounted) setRows(data) })
    return () => { isMounted = false }
  }, [])

  return (
    <DashboardListWidget
      className="h-full"
      listClassName="max-h-[320px] md:h-[250px]"
      title="Recordatorios de renovación"
      description="Vencen o vencieron en ±7 días"
      icon={BellRing}
      iconColorClass="text-amber-500"
      items={rows}
      emptyMessage="Nadie por vencer esta semana"
      renderItem={(r) => (
        <div key={r.membershipId} className="flex items-center justify-between gap-2 p-3 border border-border rounded-xl bg-muted/10">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{r.clientName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {r.className} ·{' '}
              <span className={cn('font-semibold', r.daysLeft < 0 ? 'text-rose-600' : r.daysLeft <= 2 && 'text-amber-600')}>
                {dueLabel(r.daysLeft)}
              </span>
            </p>
          </div>
          {r.phone ? (
            <a
              href={whatsappLink(r.phone, reminderMessage(r))}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-button"
              aria-label={`Enviar recordatorio por WhatsApp a ${r.clientName}`}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic shrink-0">Sin teléfono</span>
          )}
        </div>
      )}
    />
  )
}
