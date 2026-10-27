'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Search, User } from 'lucide-react'
import { Roles } from '@/lib/auth/roles'
import { searchClients } from '@/features/admin/clients/queries'
import { ClientData } from '@/features/admin/clients/types'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/store/navigation-store'
import { ADMIN_LINKS, MAIN_LINKS } from '../config'

interface CommandItem {
  id: string
  /** Set for section links so the shell shows its navigation indicator. */
  tabId?: string
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const OPEN_EVENT = 'open-command-palette'

// For touch devices without a keyboard shortcut.
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export default function CommandPalette({ role, open, onOpenChange }: { role: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const setIsNavigating = useNavigationStore((s) => s.setIsNavigating)
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientData[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(query, 250)

  // Ctrl/⌘+K anywhere, or "/" when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isTyping(e.target))) {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    const onOpen = () => onOpenChange(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    let isMounted = true
    if (debounced.trim().length < 2) {
      setClients([])
      return
    }
    searchClients(debounced).then((res) => { if (isMounted) setClients(res.slice(0, 6)) })
    return () => { isMounted = false }
  }, [debounced])

  const items = useMemo<CommandItem[]>(() => {
    const links = Roles.canManageStaff(role) ? [...MAIN_LINKS, ...ADMIN_LINKS] : MAIN_LINKS
    const q = query.trim().toLowerCase()
    const nav = links
      .filter((l) => !q || l.label.toLowerCase().includes(q))
      .map((l) => ({ id: l.id, tabId: l.id, label: l.label, hint: 'Ir a', icon: l.icon, href: l.href }))
    const people = clients.map((c) => ({
      id: c.id,
      label: c.full_name,
      hint: c.has_active_membership ? 'Alumno activo' : 'Alumno',
      icon: User,
      href: `/dashboard?tab=clients&q=${encodeURIComponent(c.full_name)}`,
    }))
    return [...people, ...nav]
  }, [role, query, clients])

  useEffect(() => { setActive(0) }, [items.length])

  if (!open) return null

  const go = (item: CommandItem | undefined) => {
    if (!item) return
    onOpenChange(false)
    if (item.tabId) setIsNavigating(true, item.tabId)
    router.push(item.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]) }
    else if (e.key === 'Escape') onOpenChange(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh] animate-in fade-in duration-150" onClick={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar o navegar"
        className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar alumno o sección..."
            className="flex-1 h-14 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
          />
          <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul id="command-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">Sin resultados</li>
          ) : items.map((item, i) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                id={`cmd-${item.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors', i === active ? 'bg-primary/10 text-foreground' : 'text-foreground/90')}
              >
                <Icon className="size-4 text-primary shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
                {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body
  )
}
