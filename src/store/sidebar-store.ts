import { create } from 'zustand'

/**
 * Sidebar Store
 *
 * El estado colapsado se persiste en una **cookie** (no localStorage) para que
 * el layout de servidor pueda leerla y renderizar el ancho correcto en el primer
 * paint — sin el "flash de nada" que producía esconder todo con opacity-0 hasta
 * hidratar. `hydrate()` siembra el store con el valor que el servidor ya conocía.
 */
export const SIDEBAR_COOKIE = 'sb_collapsed'

function writeCookie(collapsed: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
}

interface SidebarState {
  isCollapsed: boolean
  isMounted: boolean
}

interface SidebarActions {
  toggleCollapse: () => void
  hydrate: (collapsed: boolean) => void
  setIsMounted: (mounted: boolean) => void
}

export type SidebarStore = SidebarState & SidebarActions

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: true, // default: colapsado (coincide con initialCollapsed sin cookie)
  isMounted: false,

  toggleCollapse: () =>
    set((state) => {
      const next = !state.isCollapsed
      writeCookie(next)
      return { isCollapsed: next }
    }),

  hydrate: (collapsed: boolean) => set({ isCollapsed: collapsed }),
  setIsMounted: (mounted: boolean) => set({ isMounted: mounted }),
}))
