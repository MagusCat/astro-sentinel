import { describe, expect, it } from 'vitest'
import { cartQuantity, cashChange, setCartQuantity, type CartLine } from './utils'

const agua = { productId: 'p1', name: 'Agua', price: 1.5, stock: 3 }

describe('POS cart', () => {
  it('adds a line and caps it at the available stock', () => {
    let cart: CartLine[] = []
    cart = setCartQuantity(cart, agua, 1)
    cart = setCartQuantity(cart, agua, cartQuantity(cart, 'p1') + 5)
    expect(cart).toEqual([{ ...agua, quantity: 3 }])
  })

  it('removes the line when the quantity reaches zero', () => {
    const cart = setCartQuantity([{ ...agua, quantity: 2 }], agua, 0)
    expect(cart).toEqual([])
  })

  it('refreshes stock from the latest catalog when updating', () => {
    const cart = setCartQuantity([{ ...agua, quantity: 3 }], { ...agua, stock: 1 }, 3)
    expect(cart[0]).toMatchObject({ quantity: 1, stock: 1 })
  })

  it('computes cash change only when the payment covers the total', () => {
    expect(cashChange(7.5, 10)).toBe(2.5)
    expect(cashChange(7.5, 7.5)).toBe(0)
    expect(cashChange(7.5, 7)).toBeNull()
    expect(cashChange(0.3, 0.1 + 0.2)).toBe(0)
  })
})
