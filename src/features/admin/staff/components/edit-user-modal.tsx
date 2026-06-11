'use client'

import React from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { LocalUser } from '../types'
import { APP_ROLE } from '@/lib/auth/roles'
import { Modal, TextField, SelectField, FormActions } from '@/components/shared'

interface EditForm {
  full_name: string
  password_raw: string
  role: string
  auth_user_id: string
  is_active: boolean
}

interface EditUserModalProps {
  activeUser: AuthenticatedUser
  selectedUser: LocalUser
  form: EditForm
  loading: boolean
  onChange: (form: EditForm) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  errors?: Record<string, string[]>
}

export default function EditUserModal({
  activeUser,
  selectedUser,
  form,
  loading,
  onChange,
  onSubmit,
  onClose,
  errors,
}: EditUserModalProps) {
  const isAdminEditingOtherAdmin =
    activeUser.role === APP_ROLE.ADMIN &&
    selectedUser.role === APP_ROLE.ADMIN &&
    selectedUser.id !== activeUser.id

  const roleOptions = [
    { value: APP_ROLE.RECEPTION, label: 'Recepcionista' },
    { value: APP_ROLE.ADMIN, label: 'Administrador' },
    { value: APP_ROLE.MAINTAINER, label: 'Mantenedor' }
  ]

  return (
    <Modal isOpen={true} onClose={onClose} title="Modificar Operador" size="md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre Completo"
          type="text"
          required
          value={form.full_name}
          disabled={isAdminEditingOtherAdmin}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
          error={errors?.full_name?.[0]}
        />

        <TextField
          label="Nombre de Usuario"
          type="text"
          disabled
          className="bg-muted/20 text-muted-foreground font-mono cursor-not-allowed"
          value={selectedUser.username}
        />

        <TextField
          label="Nueva Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres..."
          value={form.password_raw}
          disabled={isAdminEditingOtherAdmin}
          onChange={(e) => onChange({ ...form, password_raw: e.target.value })}
          error={errors?.password_raw?.[0]}
        />

        <SelectField
          label="Rol de Sistema"
          value={form.role}
          disabled={activeUser.role === APP_ROLE.ADMIN}
          onChange={(e) => onChange({ ...form, role: e.target.value || APP_ROLE.RECEPTION })}
          error={errors?.role?.[0]}
          options={roleOptions}
        />

        {form.role !== APP_ROLE.RECEPTION && activeUser.role === APP_ROLE.MAINTAINER && (
          <div className="flex flex-col gap-1.5 border-t border-border/20 pt-4 mt-2">
            <label className="text-[11px] font-bold text-primary uppercase font-mono tracking-wider flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" />
              Vincular ID de Supabase Auth
            </label>
            <TextField
              type="text"
              required={form.role === APP_ROLE.ADMIN}
              className="border-primary/40 font-mono"
              value={form.auth_user_id}
              onChange={(e) => onChange({ ...form, auth_user_id: e.target.value })}
              error={errors?.auth_user_id?.[0]}
            />
          </div>
        )}

        <FormActions
          onCancel={onClose}
          submitText="Guardar Cambios"
          isLoading={loading}
        />
      </form>
    </Modal>
  )
}
