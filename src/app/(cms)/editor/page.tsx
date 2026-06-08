'use client'

export const runtime = 'edge';

import React, { Suspense } from 'react'
import { useActiveUser } from '@/features/auth/context'
import CmsShell from '@/features/cms/core/components/cms-shell'
import { SessionLoading } from '@/components/shared'

export default function EditorPage() {
  // Reads activeUser injected by (cms)/layout.tsx via UserProvider context
  const activeUser = useActiveUser()

  if (!activeUser) return <SessionLoading />

  return (
    <Suspense fallback={<SessionLoading />}>
      <CmsShell activeUser={activeUser} />
    </Suspense>
  )
}
