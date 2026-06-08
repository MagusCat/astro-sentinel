'use client'

import React, { useState, useEffect } from 'react'
import { AuthenticatedUser } from '@/features/auth/types'
import { Plus, Edit2, Trash2, Power, PowerOff, RefreshCw, Link as LinkIcon } from 'lucide-react'
import { LocalUser } from '../types'
import { getUsersList } from '../queries'
import { saveNewUser, updateUserData, deleteUserData } from '../mutations'
import { Toast, ToastType, Modal, FormActions, DataTable, PageHeader } from '@/components/shared'
import { Button } from '@/components/shared'
import CreateUserModal from './create-user-modal'
import EditUserModal from './edit-user-modal'
import { RoleBadge } from '@/features/auth/components/role-badge'
import { APP_ROLE } from '@/lib/auth/roles'

interface UserManagementProps {
  activeUser: AuthenticatedUser
}

const DEFAULT_CREATE_FORM = {
  full_name: '',
  username: '',
  password_raw: '',
  role: APP_ROLE.RECEPTION as string,
  auth_user_id: ''
}

export default function UserManagement({ activeUser }: UserManagementProps) {
  const [users, setUsers] = useState<LocalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showError = (msg: string) => setToast({ message: msg, type: 'error' })
  const showSuccess = (msg: string) => setToast({ message: msg, type: 'success' })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<LocalUser | null>(null)

  const [createForm, setCreateForm] = useState({ ...DEFAULT_CREATE_FORM })
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({})
  const [editForm, setEditForm] = useState({
    full_name: '',
    password_raw: '',
    role: APP_ROLE.RECEPTION as string,
    auth_user_id: '',
    is_active: true
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsersList()
      if (res.success && res.users) {
        setUsers(res.users)
      } else {
        showError(res.error || 'No se pudieron cargar los usuarios.')
      }
    } catch {
      showError('Fallo de conexión al cargar la lista de personal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])


  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateErrors({})
    setActionLoading(true)
    try {
      const res = await saveNewUser({
        full_name: createForm.full_name,
        username: createForm.username,
        password_raw: createForm.password_raw,
        role: createForm.role,
        auth_user_id: createForm.auth_user_id || undefined
      })
      if (res.success) {
        showSuccess('¡Operador registrado exitosamente!')
        setIsCreateOpen(false)
        setCreateForm({ ...DEFAULT_CREATE_FORM })
        fetchUsers()
      } else {
        if ('validationErrors' in res && res.validationErrors) {
          setCreateErrors(res.validationErrors as Record<string, string[]>)
        }
        showError(res.error || 'Error al guardar el usuario.')
      }
    } catch {
      showError('Error del servidor de base de datos.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setEditErrors({})
    setActionLoading(true)
    try {
      const res = await updateUserData(selectedUser.id, {
        full_name: editForm.full_name,
        password_raw: editForm.password_raw || undefined,
        role: editForm.role,
        auth_user_id: editForm.auth_user_id || undefined,
        is_active: editForm.is_active
      })
      if (res.success) {
        showSuccess('¡Datos del operador actualizados exitosamente!')
        setIsEditOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        if ('validationErrors' in res && res.validationErrors) {
          setEditErrors(res.validationErrors as Record<string, string[]>)
        }
        showError(res.error || 'Error al actualizar el usuario.')
      }
    } catch {
      showError('Error del servidor de base de datos.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (user: LocalUser) => {
    if (user.id === activeUser.id) {
      showError('No puedes desactivar tu propio usuario en sesión.')
      return
    }
    setActionLoading(true)
    try {
      const res = await updateUserData(user.id, { is_active: !user.is_active })
      if (res.success) {
        showSuccess(`¡Usuario ${user.is_active ? 'desactivado' : 'activado'} correctamente!`)
        fetchUsers()
      } else {
        showError(res.error || 'Error al cambiar el estado del usuario.')
      }
    } catch {
      showError('Error del servidor al cambiar el estado.')
    } finally {
      setActionLoading(false)
    }
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    setActionLoading(true)
    try {
      const res = await deleteUserData(userToDelete.id)
      if (res.success) {
        showSuccess('¡El operador fue eliminado lógicamente del sistema!')
        setUserToDelete(null)
        fetchUsers()
      } else {
        showError(res.error || 'Error al eliminar el usuario.')
      }
    } catch {
      showError('Error del servidor al eliminar el usuario.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = (user: LocalUser) => {
    setUserToDelete(user)
  }

  const openEditModal = (user: LocalUser) => {
    setEditErrors({})
    setSelectedUser(user)
    setEditForm({
      full_name: user.full_name,
      password_raw: '',
      role: user.role,
      auth_user_id: user.auth_user_id || '',
      is_active: user.is_active
    })
    setIsEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full h-full flex-1 min-w-0">
      <PageHeader
        title="Personal Registrado"
        description="Gestión de accesos y credenciales del personal de la academia"
        actions={
          <Button onClick={() => { setCreateErrors({}); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4" />
            Registrar Operador
          </Button>
        }
      />

      <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm w-full max-w-full flex flex-col flex-1 min-h-0">
        {loading ? (
          <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-4 w-full">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="font-mono">Cargando base de datos de operadores...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground italic">
            No se encontraron usuarios o personal registrado.
          </div>
        ) : (
          <DataTable
            className="flex-1"
            data={users}
            keyExtractor={(user) => user.id}
            rowClassName={(user) => !user.is_active ? 'opacity-65' : ''}
            columns={[
              {
                key: 'full_name',
                header: 'Nombre Completo',
                render: (user) => {
                  const isSelf = user.id === activeUser.id
                  return (
                    <span className="font-semibold text-foreground">
                      {user.full_name}{' '}
                      {isSelf && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1 font-mono">Tú</span>}
                    </span>
                  )
                }
              },
              {
                key: 'username',
                header: 'Nombre de Usuario',
                render: (user) => <span className="font-mono text-[11px] text-muted-foreground">@{user.username}</span>
              },
              {
                key: 'role',
                header: 'Rol en Sistema',
                render: (user) => <RoleBadge role={user.role} />
              },
              {
                key: 'status',
                header: 'Estado',
                render: (user) => (
                  <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${user.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {user.is_active ? 'Activo' : 'Desactivado'}
                  </span>
                )
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (user) => {
                  const isAdmin = activeUser.role === APP_ROLE.ADMIN
                  const isTargetMaintainer = user.role === APP_ROLE.MAINTAINER
                  const isTargetAdmin = user.role === APP_ROLE.ADMIN
                  const isSelf = user.id === activeUser.id

                  const canEdit = !isTargetMaintainer && !(isAdmin && isTargetAdmin && !isSelf)
                  const canDelete = !isTargetMaintainer && !isTargetAdmin && !isSelf
                  const canToggleStatus = !isTargetMaintainer && !isSelf

                  return (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${user.is_active ? 'text-muted-foreground hover:text-foreground' : 'text-emerald-500 hover:text-emerald-600'}`}
                        disabled={actionLoading || !canToggleStatus}
                        onClick={() => handleToggleActive(user)}
                        title={user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                      >
                        {user.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={actionLoading || !canEdit}
                        onClick={() => openEditModal(user)}
                        title="Editar Datos"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={actionLoading || !canDelete}
                        onClick={() => handleDeleteUser(user)}
                        title="Eliminar Cuenta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                }
              }
            ]}
          />

        )}
      </div>

      {isCreateOpen && (
        <CreateUserModal
          activeUser={activeUser}
          form={createForm}
          loading={actionLoading}
          onChange={setCreateForm}
          onSubmit={handleCreateSubmit}
          onClose={() => setIsCreateOpen(false)}
          errors={createErrors}
        />
      )}

      {isEditOpen && selectedUser && (
        <EditUserModal
          activeUser={activeUser}
          selectedUser={selectedUser}
          form={editForm}
          loading={actionLoading}
          onChange={setEditForm}
          onSubmit={handleEditSubmit}
          onClose={() => setIsEditOpen(false)}
          errors={editErrors}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Eliminar Operador"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-4">
          ¿Estás seguro que deseas ELIMINAR (lógicamente) al operador <span className="font-semibold text-foreground font-mono">&quot;{userToDelete?.full_name}&quot;</span>?
          Su nombre de usuario quedará retenido por seguridad.
        </p>
        <FormActions
          onCancel={() => setUserToDelete(null)}
          onSubmit={confirmDeleteUser}
          submitText="Eliminar"
          submitVariant="destructive"
          isLoading={actionLoading}
        />
      </Modal>
    </div>
  )
}
