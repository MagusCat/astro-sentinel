'use client'

import React, { createContext, useContext } from 'react'
import { AuthenticatedUser } from '@/features/auth/types'

interface UserContextValue {
  activeUser: AuthenticatedUser | null
}

const UserContext = createContext<UserContextValue>({ activeUser: null })

export function UserProvider({
  activeUser,
  children,
}: {
  activeUser: AuthenticatedUser | null
  children: React.ReactNode
}) {
  return (
    <UserContext.Provider value={{ activeUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useActiveUser(): AuthenticatedUser | null {
  return useContext(UserContext).activeUser
}
