'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { createProductSchema, updateStockSchema, productPaymentSchema, updateProductSchema } from './schemas'
import { revalidatePath, revalidateTag } from 'next/cache'
import { DASHBOARD_CACHE_TAG } from '../dashboard/cache'
import { z } from 'zod'

type CreateProductInput = z.infer<typeof createProductSchema>
type UpdateProductInput = z.infer<typeof updateProductSchema>
type UpdateStockInput = z.infer<typeof updateStockSchema>
type ProductPaymentInput = z.input<typeof productPaymentSchema>

function isUniqueSkuViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  return e?.code === '23505' || Boolean(e?.message?.includes('products_sku_key'))
}

export async function createProduct(data: CreateProductInput) {
  try {
    const { user, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = createProductSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const validData = parsed.data

    // Atomic: product + inventory + movement in a single transaction
    const { data: productId, error } = await supabase.rpc('create_product_with_inventory', {
      p_name: validData.name,
      p_description: validData.description ?? '',
      p_price: validData.price,
      p_sku: validData.sku ?? null,
      p_category: validData.category ?? null,
      p_initial_stock: validData.initial_stock,
      p_user_id: user.id
    })

    if (error) throw error

    revalidatePath('/admin/inventory')
    revalidatePath('/admin/dashboard', 'layout')
    return { success: true, product: { id: productId } }
  } catch (err) {
    if (isUniqueSkuViolation(err)) {
      return { success: false, error: 'El código SKU ya está registrado en otro producto.' }
    }
    return { success: false, error: toActionError(err, 'Error al crear producto.') }
  }
}

export async function updateStock(data: UpdateStockInput) {
  try {
    const { user, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = updateStockSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { product_id, quantity, type } = parsed.data

    const { error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: product_id,
      p_user_id: user.id,
      p_quantity: quantity,
      p_type: type
    })

    if (error) throw error

    revalidatePath('/admin/dashboard', 'layout')
    revalidatePath('/admin/inventory', 'page')
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al ajustar el stock.') }
  }
}

export async function processProductCheckout(data: ProductPaymentInput) {
  try {
    const { user, supabase } = await requireRole()

    const parsed = productPaymentSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { client_id, payment_method, items, discount } = parsed.data

    // Only product_id + quantity reach the RPC. The unit price and the total are
    // resolved server-side from products.price — the client cannot set the amount.
    const { data: payment_id, error: rpcError } = await supabase.rpc('process_product_checkout', {
      p_client_id: client_id ?? null,
      p_user_id: user.id,
      p_payment_method: payment_method,
      p_items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
      p_discount: discount,
    })

    if (rpcError) throw rpcError

    revalidatePath('/admin/inventory')
    revalidatePath('/admin/payments')
    revalidateTag(DASHBOARD_CACHE_TAG)

    return { success: true, payment_id }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al procesar la venta de productos.') }
  }
}

export async function updateProduct(data: UpdateProductInput) {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = updateProductSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const validData = parsed.data

    const { data: categoryId, error: categoryError } = await supabase.rpc('resolve_product_category', {
      p_name: validData.category ?? ''
    })
    if (categoryError) throw categoryError

    const { error } = await supabase
      .from('products')
      .update({
        name: validData.name,
        description: validData.description,
        price: validData.price,
        sku: validData.sku,
        category_id: categoryId
      })
      .eq('id', validData.id)

    if (error) throw error

    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (err) {
    if (isUniqueSkuViolation(err)) {
      return { success: false, error: 'El código SKU ya está registrado en otro producto.' }
    }
    return { success: false, error: toActionError(err, 'Error al actualizar producto.') }
  }
}

export async function deleteProduct(id: string) {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar producto.') }
  }
}
