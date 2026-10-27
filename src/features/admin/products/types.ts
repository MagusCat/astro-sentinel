export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  sku: string | null
  category_id: string | null
  /** Nombre de la categoría, resuelto desde product_categories. */
  category: string | null
  created_at: string
  updated_at: string
}

export interface Inventory {
  product_id: string
  current_stock: number
  last_updated: string
}

export type MovementType = 'SALE' | 'ADD' | 'SET' | 'INITIAL' | 'CORRECTION'

export interface InventoryMovement {
  id: string
  product_id: string
  user_id: string
  movement_type: MovementType
  quantity: number
  previous_stock: number
  new_stock: number
  created_at: string
  user?: { full_name: string } | null
}

export interface ProductWithInventory extends Product {
  inventory: Inventory | null
}

export interface ProductFilters {
  searchTerm?: string
  category?: string
  page: number
  limit: number
}

export interface ProductsResponse {
  data: ProductWithInventory[]
  count: number
}
