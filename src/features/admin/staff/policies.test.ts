import { describe, it, expect } from 'vitest'
import { enforceStaffUpdatePolicies } from './policies'
import { APP_ROLE } from '@/lib/auth/roles'
import type { AuthenticatedUser } from '@/features/auth/types'
import type { LocalUser } from './types'

const actor = (role: string, id = 'actor'): AuthenticatedUser => ({
  id, full_name: 'Actor', role: role as AuthenticatedUser['role'], username: 'actor',
})

const target = (role: string, id = 'target'): LocalUser => ({
  id, full_name: 'Target', role: role as LocalUser['role'], username: 'target',
  is_active: true, password_hash: 'hash',
} as LocalUser)

describe('enforceStaffUpdatePolicies', () => {
  it('blocks an admin from touching a maintainer', () => {
    const { error } = enforceStaffUpdatePolicies(
      actor(APP_ROLE.ADMIN), target(APP_ROLE.MAINTAINER), { full_name: 'x' }
    )
    expect(error).toBeTruthy()
  })

  it('lets an admin only toggle is_active on another admin', () => {
    const denied = enforceStaffUpdatePolicies(
      actor(APP_ROLE.ADMIN, 'a1'), target(APP_ROLE.ADMIN, 'a2'), { full_name: 'renamed' }
    )
    expect(denied.error).toBeTruthy()

    const allowed = enforceStaffUpdatePolicies(
      actor(APP_ROLE.ADMIN, 'a1'), target(APP_ROLE.ADMIN, 'a2'), { is_active: false }
    )
    expect(allowed.error).toBeUndefined()
    expect(allowed.payload).toEqual({ is_active: false })
  })

  it('lets an admin fully edit a receptionist', () => {
    const { error, payload } = enforceStaffUpdatePolicies(
      actor(APP_ROLE.ADMIN), target(APP_ROLE.RECEPTION), { full_name: 'Nuevo', is_active: false }
    )
    expect(error).toBeUndefined()
    expect(payload).toMatchObject({ full_name: 'Nuevo', is_active: false })
  })

  it('lets a maintainer change roles', () => {
    const { error, payload } = enforceStaffUpdatePolicies(
      actor(APP_ROLE.MAINTAINER), target(APP_ROLE.RECEPTION), { role: APP_ROLE.ADMIN }
    )
    expect(error).toBeUndefined()
    expect(payload).toMatchObject({ role: APP_ROLE.ADMIN })
  })

  it('forbids self-deactivation', () => {
    const { error } = enforceStaffUpdatePolicies(
      actor(APP_ROLE.ADMIN, 'same'), target(APP_ROLE.ADMIN, 'same'), { is_active: false }
    )
    expect(error).toBeTruthy()
  })
})
