'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/shared'
import { SearchInput, DataTable, EmptyState, Toast, ToastType, Modal, PageHeader, LoadingState } from '@/components/shared'
import { ClientData, ClientFilters } from '../types'
import { AuthenticatedUser } from '@/features/auth/types'
import { Roles } from '@/lib/auth/roles'
import { saveNewClient, updateClient, deleteClient } from '../mutations'
import { getClients } from '../queries'
import { useDebounce } from '@/hooks/use-debounce'
import CreateClientModal from './create-client-modal'
import ClientDetailsModal from './client-details-modal'

interface ClientRegistryProps {
  clients: ClientData[]
  activeUser: AuthenticatedUser
  onReload: () => void
}

export default function ClientRegistry({ clients, activeUser, onReload }: ClientRegistryProps) {
  const [localClients, setLocalClients] = useState<ClientData[]>(clients)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 400)
  
  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    limit: 15,
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null)
  const [clientToDetails, setClientToDetails] = useState<ClientData | null>(null)
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showError = (msg: string) => setToast({ message: msg, type: 'error' })
  const showSuccess = (msg: string) => setToast({ message: msg, type: 'success' })

  const fetchFilteredData = useCallback(async () => {
    setLoading(true)
    const res = await getClients({ ...filters, search: debouncedSearch })
    setLocalClients(res.data)
    setTotalCount(res.count)
    setLoading(false)
  }, [filters, debouncedSearch])

  useEffect(() => {
    fetchFilteredData()
  }, [fetchFilteredData])

  useEffect(() => {
    // Reset to page 1 when search changes
    setFilters(prev => ({ ...prev, page: 1 }))
  }, [debouncedSearch])

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const totalPages = Math.ceil(totalCount / filters.limit)

  const handleCreateClient = async (form: { full_name: string; phone_number: string; email: string; registration_source: string }) => {
    setActionLoading(true)
    try {
      const res = await saveNewClient({
        full_name: form.full_name,
        phone_number: form.phone_number || undefined,
        email: form.email || undefined,
        registration_source: form.registration_source || undefined
      })
      if (res.success) {
        showSuccess('¡Cliente registrado exitosamente!')
        setIsCreateOpen(false)
        onReload()
        fetchFilteredData()
        return { success: true }
      } else {
        showError(res.error || 'Error al registrar al cliente.')
        return { success: false, validationErrors: res.validationErrors }
      }
    } catch {
      showError('Error del servidor de base de datos.')
      return { success: false }
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditClient = async (form: { full_name: string; phone_number: string; email: string; registration_source: string }) => {
    if (!clientToEdit) return { success: false }
    setActionLoading(true)
    try {
      const res = await updateClient(clientToEdit.id, {
        full_name: form.full_name,
        phone_number: form.phone_number || undefined,
        email: form.email || undefined,
        registration_source: form.registration_source || undefined
      })
      if (res.success) {
        showSuccess('¡Cliente actualizado exitosamente!')
        setClientToEdit(null)
        onReload()
        fetchFilteredData()
        return { success: true }
      } else {
        showError(res.error || 'Error al actualizar al cliente.')
        return { success: false, validationErrors: res.validationErrors }
      }
    } catch {
      showError('Error del servidor de base de datos.')
      return { success: false }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return
    setActionLoading(true)
    try {
      const res = await deleteClient(clientToDelete.id)
      if (res.success) {
        showSuccess('Cliente eliminado del registro exitosamente.')
        setClientToDelete(null)
        onReload()
        fetchFilteredData()
      } else {
        showError(res.error || 'Error al eliminar cliente.')
      }
    } catch {
      showError('Error del servidor de base de datos.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full h-full flex-1 min-w-0">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra el registro y membresías de los clientes"
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <SearchInput
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              containerClassName="w-full sm:max-w-md"
            />
            <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto shrink-0">
              <Plus className="w-4 h-4" />
              Registrar Cliente
            </Button>
          </div>
        }
      />

      <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm w-full max-w-full flex-1 flex flex-col relative min-h-0">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <LoadingState />
            </div>
          )}
          {localClients.length === 0 && !loading && !debouncedSearch ? (
            <EmptyState message="No hay registros." />
          ) : localClients.length === 0 && !loading && debouncedSearch ? (
            <EmptyState message={`No se encontraron resultados para "${searchQuery}".`} />
          ) : (
            <DataTable
              className="flex-1"
              data={localClients}
              keyExtractor={(client) => client.id}
              pagination={{
                currentPage: filters.page,
                totalPages,
                totalCount,
                onPageChange: handlePageChange,
                disabled: loading
              }}
              columns={[
                {
                  key: 'full_name',
                  header: 'Nombre',
                  className: 'whitespace-nowrap',
                  render: (client) => <span className="font-semibold text-foreground">{client.full_name}</span>,
                },
                {
                  key: 'contact',
                  header: 'Contacto',
                  className: 'whitespace-nowrap',
                  render: (client) => (
                    <div className="text-muted-foreground font-mono leading-relaxed">
                      <div>{client.email || 'Sin correo'}</div>
                      <div className="text-[10px] mt-0.5">{client.phone_number || 'Sin teléfono'}</div>
                    </div>
                  ),
                },
                {
                  key: 'created_at',
                  header: 'Fecha de Registro',
                  className: 'whitespace-nowrap',
                  render: (client) => (
                    <span className="text-muted-foreground font-medium">
                      {new Date(client.created_at).toLocaleDateString('es-ES')}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'whitespace-nowrap text-right',
                  render: (client) => {
                    const canDelete = Roles.canManageStaff(activeUser.role)
                    return (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setClientToDetails(client)}
                          title="Ver Detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setClientToEdit(client)}
                          title="Editar Cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={actionLoading || !canDelete}
                          onClick={() => setClientToDelete(client)}
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  }
                },
              ]}
            />
          )}
      </div>

      {isCreateOpen && (
        <CreateClientModal
          loading={actionLoading}
          onSubmit={handleCreateClient}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {clientToEdit && (
        <CreateClientModal
          initialData={clientToEdit}
          loading={actionLoading}
          onSubmit={handleEditClient}
          onClose={() => setClientToEdit(null)}
        />
      )}

      {clientToDetails && (
        <ClientDetailsModal
          client={clientToDetails}
          onClose={() => setClientToDetails(null)}
        />
      )}

      <Modal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        title="Eliminar Cliente"
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-foreground leading-relaxed">
            ¿Estás seguro que deseas dar de baja a <span className="font-bold text-rose-500">{clientToDelete?.full_name}</span>? 
            Se realizará un borrado lógico y el cliente ya no aparecerá en los registros activos.
          </p>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="neutral" onClick={() => setClientToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
              {actionLoading ? 'Eliminando...' : 'Eliminar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
