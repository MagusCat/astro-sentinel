import { z } from 'zod'

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'El código de moneda debe tener 3 letras (ISO 4217).')

const localeCode = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-[A-Za-z0-9]{2,8})*$/, 'Formato de locale inválido (ej.: es-NI).')

export const upsertCurrencySchema = z.object({
  code: currencyCode,
  name: z.string().trim().min(2, 'El nombre es obligatorio.').max(60),
  symbol: z.string().trim().max(6).optional().nullable(),
  locale: localeCode,
})

export const setSecondaryCurrencySchema = z.object({
  code: currencyCode.nullable(),
})

export const setExchangeRateSchema = z.object({
  code: currencyCode,
  unitsPerBase: z
    .number({ invalid_type_error: 'La tasa debe ser un número.' })
    .positive('La tasa debe ser mayor que cero.')
    .max(1_000_000, 'La tasa es demasiado alta.'),
})

export const setBaseCurrencySchema = z.object({
  code: currencyCode,
  conversionRate: z
    .number({ invalid_type_error: 'La tasa de conversión debe ser un número.' })
    .positive('La tasa de conversión debe ser mayor que cero.'),
})
