import React, { Suspense } from 'react'
import { getCurrentUser } from '@/features/auth/actions'
import CmsShell from '@/features/cms/core/components/cms-shell'
import { SessionLoading } from '@/components/shared'

export default async function EditorPage() {
  const activeUser = await getCurrentUser()
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || ''

  if (!activeUser) return <SessionLoading />

  return (
    <Suspense fallback={<SessionLoading />}>
      <CmsShell activeUser={activeUser} webUrl={webUrl} />
    </Suspense>
  )
}
