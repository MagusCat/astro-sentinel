'use client'

import React from 'react'

export default function SessionLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center antialiased relative overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-wave {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}} />
      <div className="flex flex-col items-center justify-center gap-4 relative z-10">
        <div className="flex items-center gap-2.5 px-6 py-3">
          <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: 'pulse-wave 1.4s infinite ease-in-out', animationDelay: '-0.4s' }} />
          <span className="w-2 h-2 rounded-full bg-primary/80" style={{ animation: 'pulse-wave 1.4s infinite ease-in-out', animationDelay: '-0.2s' }} />
          <span className="w-2 h-2 rounded-full bg-primary/60" style={{ animation: 'pulse-wave 1.4s infinite ease-in-out' }} />
          <span className="w-2 h-2 rounded-full bg-primary/40" style={{ animation: 'pulse-wave 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
          <span className="w-2 h-2 rounded-full bg-primary/20" style={{ animation: 'pulse-wave 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}

