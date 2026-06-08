'use client'

import React, { useEffect } from 'react'
import { 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  Server
} from 'lucide-react'
import { useHealthCheck } from '../hooks/use-health-check'
import { Button } from '@/components/shared'

export default function HealthCheck() {
  const { loading, result, scanSteps, triggerScan } = useHealthCheck()

  useEffect(() => {
    triggerScan()
  }, [triggerScan])

  return (
    <div className="bg-card border border-border/40 rounded-lg p-8 shadow-sm transition-all duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-foreground tracking-tight">Database Health</h1>
            <p className="text-xs text-muted-foreground">Live database heartbeat connection diagnostic</p>
          </div>
        </div>
        
        <Button 
          onClick={triggerScan} 
          disabled={loading}
          className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 py-2.5 h-auto rounded-md flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Testing...' : 'Check Status'}
        </Button>
      </div>

      <div className="py-6 flex flex-col gap-4">
        {/* Step 1 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {scanSteps.env === 'pending' && <span className="w-5 h-5 rounded-full bg-muted border border-border/50 text-[10px] flex items-center justify-center text-muted-foreground font-semibold">1</span>}
            {scanSteps.env === 'scanning' && <RefreshCw className="w-5 h-5 text-primary animate-spin" />}
            {scanSteps.env === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {scanSteps.env === 'failed' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            <span className="text-sm font-semibold text-foreground">Secrets Decoded</span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
            scanSteps.env === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
            scanSteps.env === 'failed' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
            scanSteps.env === 'scanning' ? 'text-primary animate-pulse' : 'text-muted-foreground bg-muted'
          }`}>
            {scanSteps.env}
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {scanSteps.handshake === 'pending' && <span className="w-5 h-5 rounded-full bg-muted border border-border/50 text-[10px] flex items-center justify-center text-muted-foreground font-semibold">2</span>}
            {scanSteps.handshake === 'scanning' && <RefreshCw className="w-5 h-5 text-primary animate-spin" />}
            {scanSteps.handshake === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {scanSteps.handshake === 'failed' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            <span className="text-sm font-semibold text-foreground">API Heartbeat</span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
            scanSteps.handshake === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
            scanSteps.handshake === 'failed' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
            scanSteps.handshake === 'scanning' ? 'text-primary animate-pulse' : 'text-muted-foreground bg-muted'
          }`}>
            {scanSteps.handshake}
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {scanSteps.ping === 'pending' && <span className="w-5 h-5 rounded-full bg-muted border border-border/50 text-[10px] flex items-center justify-center text-muted-foreground font-semibold">3</span>}
            {scanSteps.ping === 'scanning' && <RefreshCw className="w-5 h-5 text-primary animate-spin" />}
            {scanSteps.ping === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {scanSteps.ping === 'failed' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            <span className="text-sm font-semibold text-foreground">Database heartbeat query</span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
            scanSteps.ping === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
            scanSteps.ping === 'failed' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
            scanSteps.ping === 'scanning' ? 'text-primary animate-pulse' : 'text-muted-foreground bg-muted'
          }`}>
            {scanSteps.ping}
          </span>
        </div>
      </div>

      {result && (
        <div className={`mt-2 p-4 rounded-md border font-mono text-xs bg-muted/30 ${
          result.connectionOk ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-amber-200 dark:border-amber-900/40'
        }`}>
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/30">
            <Server className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-bold text-foreground text-[10px] uppercase tracking-wider">Probe Output</span>
          </div>
          <div className="flex flex-col gap-1.5 leading-relaxed text-muted-foreground">
            <div><span className="text-foreground/75 font-semibold font-sans">Timestamp:</span> {result.timestamp}</div>
            <div>
              <span className="text-foreground/75 font-semibold font-sans">Status:</span>{' '}
              {result.connectionOk ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">HEALTHY</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">ERROR</span>
              )}
            </div>
            {result.message && (
              <div>
                <span className="text-foreground/75 font-semibold font-sans">Response:</span>{' '}
                <span className="text-primary font-semibold font-mono">{result.message}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
