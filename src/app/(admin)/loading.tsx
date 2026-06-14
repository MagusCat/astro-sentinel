import React from 'react'
import SessionLoading from '@/components/shared/layout/session-loading'

/**
 * Admin Loading State
 *
 * Provides a global loading indicator for route transitions within the admin dashboard.
 */
export default function AdminLoading() {
  return <SessionLoading />
}
