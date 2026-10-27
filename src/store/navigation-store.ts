import { create } from 'zustand'

interface NavigationState {
  isNavigating: boolean
  transitioningTabId: string | null
  setIsNavigating: (isNavigating: boolean, tabId?: string | null) => void
}

/**
 * Navigation Store
 * 
 * Tracks the state of section transitions in the dashboard.
 * Used to show loading indicators during Server Component data fetching.
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  transitioningTabId: null,
  setIsNavigating: (isNavigating, tabId = null) => set({ isNavigating, transitioningTabId: isNavigating ? tabId : null }),
}))
