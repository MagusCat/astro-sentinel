import React from 'react'
import SessionLoading from '@/components/shared/layout/session-loading'

/**
 * CMS Loading State
 *
 * Provides a global loading indicator for route transitions within the CMS editor.
 */
export default function CmsLoading() {
  return <SessionLoading />
}
