'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { History } from 'lucide-react'
import { Modal } from '@/components/shared'
import { listContentBackups } from '../actions'

interface BackupsModalProps {
  isOpen: boolean
  onClose: () => void
  onRestore: (backupName: string) => void
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return 'N/A'
  }
}

export default function BackupsModal({ isOpen, onClose, onRestore }: BackupsModalProps) {
  const [backups, setBackups] = useState<Array<{ name: string; created_at: string | null }>>([])
  const [loading, setLoading] = useState(false)

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    const res = await listContentBackups()
    if (res.success && res.backups) setBackups(res.backups)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) fetchBackups()
  }, [isOpen, fetchBackups])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Guardados Históricos">
      <div className="flex items-center gap-1.5 mb-3 -mt-1">
        <History className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">Selecciona una versión para restaurarla</span>
      </div>

      <div className="overflow-y-auto max-h-[300px] pr-1 space-y-2">
        {loading ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">Cargando historial...</p>
        ) : backups.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">No hay copias de seguridad guardadas.</p>
        ) : (
          backups.map((b) => (
            <div
              key={b.name}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-foreground font-mono truncate max-w-[180px]">{b.name}</span>
                <span className="text-[9px] text-muted-foreground">{formatDate(b.created_at)}</span>
              </div>
              <button
                type="button"
                onClick={() => { onRestore(b.name); onClose() }}
                className="text-[10px] font-extrabold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
              >
                Restaurar
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
