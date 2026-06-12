import React from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { APP_ROLE } from '@/lib/auth/roles'
import { Modal, TextField, SelectField, FormActions } from '@/components/shared'

interface CreateForm {
  full_name: string
  username: string
  password_raw: string
  role: string
  auth_user_id: string
}

interface CreateUserModalProps {
  activeUser: AuthenticatedUser
  form: CreateForm
  loading: boolean
  onChange: (form: CreateForm) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  errors?: Record<string, string[]>
}

export default function CreateUserModal({
  activeUser,
  form,
  loading,
  onChange,
  onSubmit,
  onClose,
  errors,
}: CreateUserModalProps) {
  const roleOptions = [
    { value: APP_ROLE.RECEPTION, label: 'Recepcionista' },
    ...(activeUser.role === APP_ROLE.MAINTAINER ? [
      { value: APP_ROLE.ADMIN, label: 'Administrador' },
      { value: APP_ROLE.MAINTAINER, label: 'Mantenedor' }
    ] : [])
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Registrar Nuevo Operador"
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText="Registrar"
          isLoading={loading}
          formId="user-form"
          className="mt-0"
        />
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre Completo"
          type="text"
          required
          placeholder="Ej. Laura López"
          value={form.full_name}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
          error={errors?.full_name?.[0]}
        />

        <TextField
          label="Nombre de Usuario"
          type="text"
          required
          placeholder="Ej. laura_reception"
          className="font-mono"
          value={form.username}
          onChange={(e) => onChange({ ...form, username: e.target.value })}
          error={errors?.username?.[0]}
        />

        <TextField
          label="Contraseña"
          type="password"
          required
          placeholder="Mínimo 6 caracteres..."
          value={form.password_raw}
          onChange={(e) => onChange({ ...form, password_raw: e.target.value })}
          error={errors?.password_raw?.[0]}
        />

        <SelectField
          label="Rol de Sistema"
          value={form.role}
          disabled={activeUser.role === APP_ROLE.ADMIN}
          onChange={(e) => onChange({ ...form, role: e.target.value || APP_ROLE.RECEPTION, auth_user_id: '' })}
          error={errors?.role?.[0]}
          options={roleOptions}
        />
        {activeUser.role === APP_ROLE.ADMIN && (
          <span className="text-[9px] text-muted-foreground italic -mt-2">Como Administrador, solo puedes registrar Recepcionistas.</span>
        )}

        {form.role !== APP_ROLE.RECEPTION && activeUser.role === APP_ROLE.MAINTAINER && (
          <div className="flex flex-col gap-1.5 border-t border-border/20 pt-4 mt-2">
            <label className="text-[10px] font-bold text-primary uppercase font-mono tracking-wider flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" />
              ID de Supabase Auth (auth_user_id)
            </label>
            <TextField
              type="text"
              required={form.role === APP_ROLE.ADMIN}
              placeholder="Ej. f321c876-0000-0000-0000-000000000000"
              className="border-primary/40 font-mono"
              value={form.auth_user_id}
              onChange={(e) => onChange({ ...form, auth_user_id: e.target.value })}
              error={errors?.auth_user_id?.[0]}
            />
            <span className="text-[9px] text-muted-foreground leading-relaxed">
              Registra primero al usuario en Supabase Auth y vincula su UUID aquí.
            </span>
          </div>
        )}

      </form>
    </Modal>
  )
}
