import { create } from 'zustand'

interface NavigationState {
  isNavigating: boolean
  setIsNavigating: (isNavigating: boolean) => void
}

/**
 * Navigation Store
 * 
 * Tracks the state of section transitions in the dashboard.
 * Used to show loading indicators during Server Component data fetching.
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (isNavigating) => set({ isNavigating }),
}))
