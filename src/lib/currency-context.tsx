'use client'

import React, { createContext, useContext } from 'react'
import { APP_CONFIG } from '@/lib/config'
import type { CurrencySettings } from './currency'

const FALLBACK: CurrencySettings = {
  base: { code: APP_CONFIG.currency.base, locale: APP_CONFIG.currency.baseLocale },
  secondary: null,
}

const CurrencyContext = createContext<CurrencySettings>(FALLBACK)

export function CurrencyProvider({
  settings,
  children,
}: {
  settings: CurrencySettings
  children: React.ReactNode
}) {
  return (
    <CurrencyContext.Provider value={settings}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencySettings {
  return useContext(CurrencyContext)
}
