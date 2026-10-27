import { z } from 'zod'
import { discountSchema, paymentMethodSchema } from '@/lib/validation/common'

export const createProductSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  initial_stock: z.coerce.number().int().min(0, 'El stock inicial no puede ser negativo').default(0)
})

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable()
})

export const updateStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int(),
  type: z.enum(['ADD', 'SET'])
})

export const productPaymentSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  payment_method: paymentMethodSchema,
  discount: discountSchema,
  items: z.array(z.object({
    product_id: z.string().uuid(),
    product_name: z.string().optional(),
    quantity: z.coerce.number().int().positive(),
    price: z.number().min(0)
  })).min(1, 'Debe incluir al menos un producto')
})
