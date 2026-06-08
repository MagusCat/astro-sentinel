export interface HealthStatus {
  serviceConfigured: boolean
  handshakeOk: boolean
  connectionOk: boolean
  message?: string
  timestamp: string
}
