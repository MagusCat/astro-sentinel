interface TicketData {
  id: string
  clientName: string
  date: string
  paymentMethod: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  type: 'PRODUCT' | 'MEMBERSHIP'
  /** Amount already subtracted from `total` (shown as its own line). */
  discount?: number
  voidReason?: string | null
}

export const generateTicketPDF = async (data: TicketData) => {
  // Dynamic import to reduce initial bundle size
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200] // Thermal printer style (80mm width)
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10

  // 1. Header (Modern Minimal)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SENTINEL', pageWidth / 2, 15, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('CENTRO DE ENTRENAMIENTO', pageWidth / 2, 20, { align: 'center' })
  doc.text('------------------------------------------', pageWidth / 2, 25, { align: 'center' })

  // 2. Receipt Info
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TICKET DE VENTA', margin, 35)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Nro: ${data.id.substring(0, 8).toUpperCase()}`, margin, 40)
  doc.text(`Fecha: ${new Date(data.date).toLocaleString('es-ES')}`, margin, 45)
  doc.text(`Cliente: ${data.clientName}`, margin, 50)
  doc.text(`Pago: ${data.paymentMethod}`, margin, 55)
  if (data.voidReason) {
    doc.setFont('helvetica', 'bold')
    doc.text(`ANULADO: ${data.voidReason}`.slice(0, 48), margin, 60)
    doc.setFont('helvetica', 'normal')
  }

  // 3. Items Table
  autoTable(doc, {
    startY: 65,
    margin: { left: margin - 2, right: margin - 2 },
    body: data.items.map(item => [
      item.name,
      item.quantity.toString(),
      `$${(item.price * item.quantity).toFixed(2)}`
    ]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 20, halign: 'right' }
    }
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  if (data.discount && data.discount > 0) {
    doc.setFontSize(9)
    doc.text('DESCUENTO', margin, finalY - 2)
    doc.text(`-$${data.discount.toFixed(2)}`, pageWidth - margin, finalY - 2, { align: 'right' })
    finalY += 6
  }

  // 4. Total
  doc.text('------------------------------------------', pageWidth / 2, finalY - 5, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', margin, finalY)
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' })

  // 5. Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.text('¡Gracias por tu compra!', pageWidth / 2, finalY + 15, { align: 'center' })
  doc.text('sentinel.app', pageWidth / 2, finalY + 20, { align: 'center' })

  // Save/Download
  doc.save(`ticket-${data.id.substring(0, 8)}.pdf`)
}

// ── POS cart (pure, presentation-only; the RPC recomputes prices and stock) ──

export interface CartLine {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number
}

/** Sets a line's quantity, clamped to [0, stock]; 0 removes the line. Returns the new cart. */
export function setCartQuantity(cart: CartLine[], line: Omit<CartLine, 'quantity'>, quantity: number): CartLine[] {
  const qty = Math.max(0, Math.min(Math.trunc(quantity), line.stock))
  const exists = cart.some((l) => l.productId === line.productId)
  if (qty === 0) return cart.filter((l) => l.productId !== line.productId)
  if (!exists) return [...cart, { ...line, quantity: qty }]
  return cart.map((l) => (l.productId === line.productId ? { ...l, quantity: qty, stock: line.stock } : l))
}

export function cartQuantity(cart: CartLine[], productId: string): number {
  return cart.find((l) => l.productId === productId)?.quantity ?? 0
}

/** Cash change to hand back; null when the amount received does not cover the total. */
export function cashChange(total: number, received: number): number | null {
  const diff = Math.round((received - total) * 100) / 100
  return diff >= 0 ? diff : null
}
