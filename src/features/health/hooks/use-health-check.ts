import { useState, useCallback } from 'react'
import { runHealthCheck } from '../actions'
import { HealthStatus } from '../types'

export type ScanStepState = 'pending' | 'scanning' | 'success' | 'failed'

export interface ScanSteps {
  env: ScanStepState
  handshake: ScanStepState
  ping: ScanStepState
}

export function useHealthCheck() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthStatus | null>(null)
  const [scanSteps, setScanSteps] = useState<ScanSteps>({
    env: 'pending',
    handshake: 'pending',
    ping: 'pending'
  })

  const triggerScan = useCallback(async () => {
    setLoading(true)
    setResult(null)
    
    setScanSteps({ env: 'scanning', handshake: 'pending', ping: 'pending' })
    await new Promise(r => setTimeout(r, 550))
    
    const diag = await runHealthCheck()
    
    if (!diag.serviceConfigured) {
      setScanSteps({ env: 'failed', handshake: 'pending', ping: 'pending' })
      setResult(diag)
      setLoading(false)
      return
    }
    setScanSteps(prev => ({ ...prev, env: 'success', handshake: 'scanning' }))
    
    await new Promise(r => setTimeout(r, 650))
    if (!diag.handshakeOk) {
      setScanSteps(prev => ({ ...prev, handshake: 'failed' }))
      setResult(diag)
      setLoading(false)
      return
    }
    setScanSteps(prev => ({ ...prev, handshake: 'success', ping: 'scanning' }))
    
    await new Promise(r => setTimeout(r, 550))
    setScanSteps(prev => ({ 
      ...prev, 
      ping: diag.connectionOk ? 'success' : 'failed' 
    }))
    
    setResult(diag)
    setLoading(false)
  }, [])

  return {
    loading,
    result,
    scanSteps,
    triggerScan
  }
}
