import React, { Suspense } from 'react'
import { getCurrentUser } from '@/features/auth/actions'
import CmsShell from '@/features/cms/core/components/cms-shell'
import SetupRequired from '@/features/cms/core/components/setup-required'
import SessionLoading from '@/components/shared/layout/session-loading'
import { getSiteContent, getLastPublicationDate } from '@/features/cms/core/actions'
import { formatDate } from '@/lib/utils'

/**
 * CMS Editor Page — Server Component (Next.js 15)
 *
 * Pre-fetches the initial site content and publication date on the server
 * to eliminate the client-side data waterfall.
 */
export default async function EditorPage() {
  const activeUser = await getCurrentUser()
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || ''

  if (!activeUser) return <SessionLoading />

  // Pre-fetch site content and last publication date
  const [contentRes, dateRes] = await Promise.all([
    getSiteContent(),
    getLastPublicationDate(),
  ])

  // Resilience: If buckets are missing, show the setup guide instead of crashing
  if (contentRes.isBucketMissing) {
    return <SetupRequired />
  }

  return (
    <Suspense fallback={<SessionLoading />}>
      <CmsShell 
        activeUser={activeUser} 
        webUrl={webUrl} 
        initialContent={contentRes.success ? contentRes.content : undefined}
        initialLastPublished={formatDate(dateRes.date)}
      />
    </Suspense>
  )
}

