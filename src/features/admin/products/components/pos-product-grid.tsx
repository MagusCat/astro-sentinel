'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { EmptyState, PriceDisplay, StatusBadge } from '@/components/shared'
import { cn } from '@/lib/utils'
import { ProductWithInventory } from '../types'

interface PosProductGridProps {
  products: ProductWithInventory[]
  inCart: (productId: string) => number
  onAdd: (product: ProductWithInventory) => void
}

const LOW_STOCK = 3

export default function PosProductGrid({ products, inCart, onAdd }: PosProductGridProps) {
  if (products.length === 0) {
    return <EmptyState message="No hay productos que coincidan con la búsqueda." />
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 stagger-children">
      {products.map((product) => {
        const stock = product.inventory?.current_stock ?? 0
        const qty = inCart(product.id)
        const soldOut = stock - qty <= 0

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onAdd(product)}
            disabled={soldOut}
            aria-label={`Agregar ${product.name}`}
            className={cn('pos-product-card', qty > 0 && 'pos-product-card-selected')}
          >
            {qty > 0 && (
              <span key={qty} className="pos-qty-bubble animate-pop-in" aria-label={`${qty} en el carrito`}>{qty}</span>
            )}
            <span className="font-bold text-foreground line-clamp-2 text-left">{product.name}</span>
            <PriceDisplay amount={product.price} className="text-base font-black text-primary" />
            <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border/40">
              {stock <= 0 ? (
                <StatusBadge status="out_of_stock" />
              ) : (
                <span className={cn('text-xs font-semibold', stock <= LOW_STOCK ? 'text-amber-600' : 'text-muted-foreground')}>
                  {stock} en stock
                </span>
              )}
              {!soldOut && <Plus className="size-4 text-primary shrink-0" aria-hidden />}
            </div>
          </button>
        )
      })}
    </div>
  )
}
