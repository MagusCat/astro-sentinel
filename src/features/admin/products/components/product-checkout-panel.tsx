'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Printer, ScanLine } from 'lucide-react'
import { Button, PriceDisplay, SectionCard, TextField, Toast, ToastType } from '@/components/shared'
import { AuthenticatedUser } from '@/features/auth/types'
import { ClientData } from '@/features/admin/clients/types'
import { Roles } from '@/lib/auth/roles'
import { lineTotal, sumMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductWithInventory } from '../types'
import { processProductCheckout } from '../mutations'
import { CartLine, cartQuantity, generateTicketPDF, setCartQuantity } from '../utils'
import PosProductGrid from './pos-product-grid'
import PosCartSummary, { PosPaymentMethod } from './pos-cart-summary'

interface ProductCheckoutPanelProps {
  products: ProductWithInventory[]
  activeUser: AuthenticatedUser
  onReload: () => void
}

const METHOD_LABELS: Record<PosPaymentMethod, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }
// The dashboard remounts each tab, so the open sale survives a tab switch here.
const CART_KEY = 'sentinel:pos-cart'

interface CompletedSale {
  id: string
  lines: CartLine[]
  total: number
  discount: number
  method: PosPaymentMethod
  clientName: string
}

export default function ProductCheckoutPanel({ products, activeUser, onReload }: ProductCheckoutPanelProps) {
  const canDiscount = Roles.canManageStaff(activeUser.role)
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('ALL')
  const [cart, setCart] = useState<CartLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('efectivo')
  const [client, setClient] = useState<Pick<ClientData, 'id' | 'full_name'> | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState<CompletedSale | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem(CART_KEY)
    if (saved) {
      try { setCart(JSON.parse(saved) as CartLine[]) } catch { sessionStorage.removeItem(CART_KEY) }
    }
    // Delay autofocus to prevent breaking the layout/blur transition from navigation
    const timer = setTimeout(() => document.getElementById('checkout-search')?.focus(), 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (cart.length) sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
    else sessionStorage.removeItem(CART_KEY)
  }, [cart])

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  )

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return products.filter((p) =>
      (category === 'ALL' || p.category === category) &&
      (!term || p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
    )
  }, [products, searchTerm, category])

  const toLine = (p: ProductWithInventory) => ({ productId: p.id, name: p.name, price: p.price, stock: p.inventory?.current_stock ?? 0 })

  const addToCart = (product: ProductWithInventory) => {
    const line = toLine(product)
    if (cartQuantity(cart, product.id) >= line.stock) {
      setToast({ message: `No hay más stock de ${product.name}`, type: 'warning' })
      return
    }
    setCart((prev) => setCartQuantity(prev, line, cartQuantity(prev, product.id) + 1))
  }

  const changeQuantity = (line: CartLine, quantity: number) => {
    const fresh = products.find((p) => p.id === line.productId)
    setCart((prev) => setCartQuantity(prev, fresh ? toLine(fresh) : line, quantity))
  }

  // Barcode scanners type the SKU and press Enter.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchTerm.trim()) return
    e.preventDefault()
    const match = products.find((p) => p.sku?.toLowerCase() === searchTerm.trim().toLowerCase())
    if (match) {
      addToCart(match)
      setSearchTerm('')
    } else if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0])
      setSearchTerm('')
    } else {
      setToast({ message: `No hay un producto con el código "${searchTerm.trim()}"`, type: 'warning' })
    }
  }

  // Presentation only: the RPC recomputes prices, stock and the discount in SQL.
  const subtotal = sumMoney(cart.map((l) => lineTotal(l.price, l.quantity)))
  const discount = canDiscount ? Math.min(Math.max(Number(discountInput) || 0, 0), subtotal) : 0
  const total = sumMoney([subtotal, -discount])

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setLoading(true)
    const res = await processProductCheckout({
      client_id: client?.id ?? null,
      payment_method: paymentMethod,
      discount: discount || undefined,
      items: cart.map((l) => ({ product_id: l.productId, product_name: l.name, quantity: l.quantity, price: l.price })),
    })
    setLoading(false)

    if (res.success && res.payment_id) {
      setCompleted({ id: res.payment_id, lines: cart, total, discount, method: paymentMethod, clientName: client?.full_name || 'Anónimo' })
      setCart([])
      setClient(null)
      setDiscountInput('')
      onReload()
    } else {
      setToast({ message: res.error || 'Error al procesar la venta', type: 'error' })
    }
  }

  const printTicket = (sale: CompletedSale) => generateTicketPDF({
    id: sale.id,
    clientName: sale.clientName,
    date: new Date().toISOString(),
    paymentMethod: METHOD_LABELS[sale.method],
    items: sale.lines.map((l) => ({ name: l.name, quantity: l.quantity, price: l.price })),
    total: sale.total,
    discount: sale.discount,
    type: 'PRODUCT',
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionCard title="Catálogo" description="Toca un producto o escanea su código" className="lg:col-span-3">
        <div className="flex flex-col gap-4">
          <TextField
            id="checkout-search"
            placeholder="Buscar o escanear código de barras…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Buscar producto o escanear código"
          />
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" role="tablist" aria-label="Categorías">
              {['ALL', ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => setCategory(c)}
                  className={cn('pos-chip', category === c && 'pos-chip-active')}
                >
                  {c === 'ALL' ? 'Todo' : c}
                </button>
              ))}
            </div>
          )}
          <PosProductGrid products={filteredProducts} inCart={(id) => cartQuantity(cart, id)} onAdd={addToCart} />
        </div>
      </SectionCard>

      <SectionCard title="Venta actual" className="lg:col-span-2 lg:sticky lg:top-4">
        {completed ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-in-up">
            <CheckCircle2 className="size-14 text-emerald-500 animate-pop-in" />
            <div>
              <p className="text-lg font-bold">Venta registrada</p>
              <p className="text-sm text-muted-foreground">{completed.clientName} · {METHOD_LABELS[completed.method]}</p>
            </div>
            <PriceDisplay amount={completed.total} className="text-3xl font-black" showSecondary />
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="neutral" onClick={() => printTicket(completed)}><Printer className="size-4" /> Ticket</Button>
              <Button onClick={() => setCompleted(null)}><ScanLine className="size-4" /> Nueva venta</Button>
            </div>
          </div>
        ) : (
          <PosCartSummary
            cart={cart}
            subtotal={subtotal}
            total={total}
            onQuantity={changeQuantity}
            paymentMethod={paymentMethod}
            onPaymentMethod={setPaymentMethod}
            client={client}
            onClient={setClient}
            canDiscount={canDiscount}
            discountInput={discountInput}
            onDiscountInput={setDiscountInput}
            loading={loading}
            onConfirm={handleCheckout}
          />
        )}
      </SectionCard>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
