import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  isMounted: boolean // Global mounting state
}

interface SidebarActions {
  toggleCollapse: () => void
  setIsMounted: (mounted: boolean) => void
}

export type SidebarStore = SidebarState & SidebarActions

/**
 * Sidebar Store
 * 
 * Manages the collapsed state of the application sidebar.
 * Persists the user preference to localStorage.
 */
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMounted: false,
      
      toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setIsMounted: (mounted: boolean) => set({ isMounted: mounted }),
    }),
    {
      name: 'sentinel-sidebar-state',
      // Only persist isCollapsed
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
)
