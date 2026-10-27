'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { requireRole } from '@/lib/auth/guard'
import { ProductFilters, ProductsResponse, ProductWithInventory, Product, Inventory } from './types'

/** Strips PostgREST filter metacharacters from a user-supplied search term. */
function sanitizeSearchTerm(raw: string): string {
  return raw.trim().replace(/[,"()*]/g, '')
}

// Supabase may return inventory as object (1-to-1) or array depending on context
interface RawProductRow extends Omit<Product, 'category'> {
  inventory: Inventory | Inventory[] | null
  product_categories: { name: string } | null
}

function normalizeInventory(inv: Inventory | Inventory[] | null | undefined): Inventory | null {
  if (!inv) return null
  return Array.isArray(inv) ? (inv[0] || null) : inv
}

function toProduct({ product_categories, inventory, ...p }: RawProductRow): ProductWithInventory {
  return { ...p, category: product_categories?.name ?? null, inventory: normalizeInventory(inventory) }
}

export async function getProducts(filters?: ProductFilters): Promise<ProductsResponse> {
  noStore()
  try {
    const { supabase } = await requireRole()

    let query = supabase
      .from('products')
      .select(`*, inventory(*), product_categories${filters?.category ? '!inner' : ''}(name)`, { count: 'exact' })
      .eq('is_active', true)

    if (filters) {
      if (filters.searchTerm) {
        const term = sanitizeSearchTerm(filters.searchTerm)
        query = query.or(`name.ilike."%${term}%",sku.ilike."%${term}%"`)
      }
      if (filters.category) {
        query = query.eq('product_categories.name', filters.category)
      }

      const { page, limit } = filters
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) throw error

    const formattedData = ((data as unknown as RawProductRow[]) || []).map(toProduct)

    return { data: formattedData, count: count || 0 }
  } catch (err) {
    console.error('Error fetching products:', err)
    return { data: [], count: 0 }
  }
}

export async function getProductById(id: string): Promise<ProductWithInventory | null> {
  noStore()
  try {
    const { supabase } = await requireRole()
    const { data, error } = await supabase
      .from('products')
      .select('*, inventory(*), product_categories(name)')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return null

    return toProduct(data as unknown as RawProductRow)
  } catch (err) {
    console.error(`Error fetching product ${id}:`, err)
    return null
  }
}

export async function getProductMovements(productId: string) {
  noStore()
  try {
    const { supabase } = await requireRole()
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, user:users!user_id(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error(`Error fetching movements for product ${productId}:`, err)
    return { success: false, data: [] }
  }
}
