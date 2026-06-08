'use client'

import React from 'react'
import { useActiveUser } from '@/features/auth/context'
import DashboardPanel from '@/features/admin/dashboard/components/dashboard-panel'
import { SessionLoading } from '@/components/shared'

export default function DashboardPage() {
  // Reads activeUser injected by (admin)/layout.tsx via UserProvider context
  const activeUser = useActiveUser()

  if (!activeUser) return <SessionLoading />

  return <DashboardPanel activeUser={activeUser} />
}
