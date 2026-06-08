export interface PaymentData {
  id: string
  total_amount: number
  payment_method: string
  transaction_date: string
  client_name: string
  user_name: string
  user_role: string
}

export interface PaymentFilters {
  searchTerm?: string
  startDate?: string
  endDate?: string
  paymentMethod?: string
  sortBy?: 'transaction_date' | 'payment_method' | 'total_amount'
  sortOrder?: 'asc' | 'desc'
  page: number
  limit: number
}

export interface PaymentsResponse {
  data: PaymentData[]
  count: number
}

export interface ClientJoin {
  full_name: string
}

export interface UserJoin {
  full_name: string
  role: string
}

export interface PaymentWithJoins {
  id: string
  total_amount: number
  payment_method: string
  transaction_date: string
  clients: ClientJoin | null
  users: UserJoin | null
}

