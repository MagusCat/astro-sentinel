export interface StorageFile {
  name: string
  id: string
  created_at: string
  url?: string
  metadata: Record<string, unknown> | null
}

export interface BucketStats {
  totalSize: number
  fileCount: number
}
