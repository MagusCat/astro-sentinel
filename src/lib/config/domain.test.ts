import { describe, it, expect } from 'vitest'
import { Roles, APP_ROLE } from './domain'

describe('Roles', () => {
  it('dashboard access is granted to every known role and denied to strangers', () => {
    expect(Roles.canAccessDashboard(APP_ROLE.RECEPTION)).toBe(true)
    expect(Roles.canAccessDashboard(APP_ROLE.ADMIN)).toBe(true)
    expect(Roles.canAccessDashboard(APP_ROLE.MAINTAINER)).toBe(true)
    expect(Roles.canAccessDashboard('ghost')).toBe(false)
  })

  it('CMS and staff management exclude reception', () => {
    expect(Roles.canAccessCms(APP_ROLE.RECEPTION)).toBe(false)
    expect(Roles.canAccessCms(APP_ROLE.ADMIN)).toBe(true)
    expect(Roles.canManageStaff(APP_ROLE.RECEPTION)).toBe(false)
  })

  it('only the maintainer reaches developer tools and admin management', () => {
    expect(Roles.canAccessDeveloper(APP_ROLE.MAINTAINER)).toBe(true)
    expect(Roles.canAccessDeveloper(APP_ROLE.ADMIN)).toBe(false)
    expect(Roles.canManageAdmins(APP_ROLE.ADMIN)).toBe(false)
  })

  it('an admin may create only reception; a maintainer may create anyone', () => {
    expect(Roles.canCreateRole(APP_ROLE.ADMIN, APP_ROLE.RECEPTION)).toBe(true)
    expect(Roles.canCreateRole(APP_ROLE.ADMIN, APP_ROLE.ADMIN)).toBe(false)
    expect(Roles.canCreateRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)).toBe(false)
    expect(Roles.canCreateRole(APP_ROLE.MAINTAINER, APP_ROLE.ADMIN)).toBe(true)
    expect(Roles.canCreateRole(APP_ROLE.RECEPTION, APP_ROLE.RECEPTION)).toBe(false)
  })

  it('delete permissions mirror creation permissions', () => {
    expect(Roles.canDeleteUser(APP_ROLE.ADMIN, APP_ROLE.RECEPTION)).toBe(true)
    expect(Roles.canDeleteUser(APP_ROLE.ADMIN, APP_ROLE.ADMIN)).toBe(false)
    expect(Roles.canDeleteUser(APP_ROLE.MAINTAINER, APP_ROLE.ADMIN)).toBe(true)
  })
})
