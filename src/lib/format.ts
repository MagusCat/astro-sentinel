const SCALE = 10_000

export function toMinor(amount: number | string): number {
  return Math.round((Number(amount) || 0) * SCALE)
}

export function fromMinor(minor: number): number {
  return minor / SCALE
}

export function sumMoney(amounts: Array<number | string>): number {
  return fromMinor(amounts.reduce<number>((acc, a) => acc + toMinor(a), 0))
}

export function lineTotal(price: number | string, quantity: number): number {
  return fromMinor(toMinor(price) * Math.trunc(quantity))
}

export function convertMoney(amount: number | string, rate: number): number {
  return fromMinor(Math.round(toMinor(amount) * rate))
}

export function baseToLocal(amountBase: number | string, unitsPerBase: number): number {
  return convertMoney(amountBase, unitsPerBase)
}

export function localToBase(amountLocal: number | string, unitsPerBase: number): number {
  return unitsPerBase === 0 ? 0 : convertMoney(amountLocal, 1 / unitsPerBase)
}

export function formatMoney(
  amount: number | string,
  currency: string,
  locale: string
): string {
  const value = Number(amount)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(Number.isFinite(value) ? value : 0)
}
