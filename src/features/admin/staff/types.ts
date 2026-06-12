export interface LocalUser {
  id: string
  full_name: string
  role: string
  username: string
  is_active: boolean
  auth_user_id?: string | null
  created_at?: string
  password_hash?: string
}

export interface UpdatePayload {
  full_name?: string
  password_hash?: string
  is_active?: boolean
  role?: string
  auth_user_id?: string | null
}
