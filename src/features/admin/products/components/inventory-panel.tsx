'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, History, Tag, ArrowRightLeft, Trash2, Copy } from 'lucide-react'
import { ProductWithInventory } from '../types'
import { createProduct, updateStock, deleteProduct } from '../mutations'
import { Button, ContextualBanner, DataTable, PageHeader, PriceDisplay, StatusBadge, TextField, SelectField, Toast, ToastType, Modal } from '@/components/shared';

import CreateProductModal from './create-product-modal'
import ProductDetailsModal from './product-details-modal'
import InventoryHistorySection from './inventory-history-section'
import AdjustStockModal from './adjust-stock-modal'

interface InventoryPanelProps {
  products: ProductWithInventory[]
  alerts?: { lowStockCount: number }
  onReload: () => void
}

export default function InventoryPanel({ products, alerts, onReload }: InventoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingHistoryProduct, setViewingHistoryProduct] = useState<ProductWithInventory | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithInventory | null>(null)
  const [productToDelete, setProductToDelete] = useState<ProductWithInventory | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  useEffect(() => {
    // Delay autofocus to prevent breaking the layout/blur transition from navigation
    const timer = setTimeout(() => {
      document.getElementById('inventory-search')?.focus()
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateProduct = async (data: { name: string; description: string; price: number; sku: string; category: string; initial_stock: number }) => {
    setLoading(true)
    const res = await createProduct(data)
    setLoading(false)
    if (res.success) {
      setToast({ message: 'Producto registrado correctamente', type: 'success' })
      setShowCreateModal(false)
      onReload()
    } else {
      setToast({ message: res.error || 'Error al registrar producto', type: 'error' })
    }
    return res
  }

  const handleAdjustStock = async (data: { product_id: string; quantity: number; type: 'ADD' | 'SET' }) => {
    setLoading(true)
    const res = await updateStock(data)
    setLoading(false)
    if (res.success) {
      setToast({ message: 'Stock actualizado correctamente', type: 'success' })
      setAdjustingProduct(null)
      onReload()
    } else {
      setToast({ message: res.error || 'Error al actualizar stock', type: 'error' })
    }
    return res
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    
    setLoading(true)
    const res = await deleteProduct(productToDelete.id)
    setLoading(false)
    if (res.success) {
      setToast({ message: 'Producto eliminado correctamente', type: 'success' })
      setProductToDelete(null)
      onReload()
    } else {
      setToast({ message: res.error || 'Error al eliminar producto', type: 'error' })
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Producto',
      render: (p: ProductWithInventory) => (
        <span className="font-bold text-foreground">{p.name}</span>
      )
    },
    {
      key: 'sku',
      header: 'Código',
      render: (p: ProductWithInventory) => {
        const handleCopy = () => {
          navigator.clipboard.writeText(p.sku || '')
          setToast({ message: 'Código copiado al portapapeles', type: 'success' })
        }
        return (
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md hover:bg-muted text-left transition-colors group cursor-pointer"
            title="Copiar código"
          >
            <span className="text-[11px] font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">{p.sku || 'SIN-SKU'}</span>
            <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100" />
          </button>
        )
      }
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (p: ProductWithInventory) => (
        <span className="text-xs capitalize text-muted-foreground">{p.category || 'General'}</span>
      )
    },
    {
      key: 'price',
      header: 'Precio',
      render: (p: ProductWithInventory) => (
        <PriceDisplay amount={p.price} />
      )
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p: ProductWithInventory) => {
        const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory
        const stock = inv?.current_stock ?? 0
        const status = stock > 10 ? 'active' : stock > 0 ? 'frozen' : 'out_of_stock'
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm">{stock}</span>
            <StatusBadge 
              status={status} 
              // Custom labels handled directly or through StatusBadge component
            />
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p: ProductWithInventory) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${viewingHistoryProduct?.id === p.id ? 'text-primary bg-primary/10 hover:text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-primary'}`}
            onClick={() => setViewingHistoryProduct(viewingHistoryProduct?.id === p.id ? null : p)}
            title="Ver Historial"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-amber-500" 
            title="Ajustar Stock"
            onClick={() => setAdjustingProduct(p)}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground" 
            title="Editar Detalles"
            onClick={() => setSelectedProduct(p)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-rose-500" 
            title="Eliminar Producto"
            onClick={() => setProductToDelete(p)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <div className="flex flex-col gap-6 w-full max-w-full h-full flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {alerts && alerts.lowStockCount > 0 && (
          <ContextualBanner 
            variant="warning"
            message={`Aviso: Hay ${alerts.lowStockCount} productos con stock bajo o agotado en el inventario.`}
          />
        )}

        <PageHeader
          title="Inventario de Productos"
          description="Gestiona el stock físico y catálogo de la tienda"
          actions={
            <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 w-full lg:w-auto items-center">
              <div className="col-span-1 w-full lg:w-64">
                <TextField
                  id="inventory-search"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-span-1 w-full lg:w-48">
                <SelectField
                  label=""
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { label: 'Categorías', value: 'ALL' },
                    ...categories.map(c => ({ label: c, value: c }))
                  ]}
                />
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="col-span-2 w-full lg:w-auto mt-1 lg:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </div>
          }
        />

        <div className="relative bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm w-full max-w-full flex flex-col flex-1 min-h-[300px]">
          <div className="flex-1 flex flex-col">
            <DataTable
              className="flex-1"
              columns={columns}
              data={filteredProducts}
              keyExtractor={(p) => p.id}
            />
          </div>
        </div>

        {viewingHistoryProduct && (
          <InventoryHistorySection 
            product={viewingHistoryProduct} 
            onClose={() => setViewingHistoryProduct(null)} 
          />
        )}
      </div>

      {showCreateModal && (
        <CreateProductModal
          loading={loading}
          onSubmit={handleCreateProduct}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {adjustingProduct && (
        <AdjustStockModal
          product={adjustingProduct}
          loading={loading}
          onSubmit={handleAdjustStock}
          onClose={() => setAdjustingProduct(null)}
        />
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onReload={onReload}
          onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
        />
      )}

      {productToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setProductToDelete(null)}
          title="Eliminar Producto"
          size="sm"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="ghost" onClick={() => setProductToDelete(null)} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDeleteProduct} disabled={loading}>
                Eliminar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-foreground">
              ¿Estás seguro de que deseas eliminar el producto <span className="font-bold">{productToDelete.name}</span>?
            </p>
            <p className="text-xs text-muted-foreground">
              Esta acción no se puede deshacer y eliminará también el historial de inventario asociado.
            </p>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
