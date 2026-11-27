import { api } from './client'
import { getToken, setGuestCartId } from './token'
import { cartSchema, type AddCartItemInput } from '@/contracts/cart'

const parse = (data: unknown) => {
  const cart = cartSchema.parse(data)
  // Visitante: a API cria o carrinho no primeiro acesso; guardamos o id para os próximos
  if (!getToken()) setGuestCartId(cart.id)
  return cart
}

export const fetchCart = async (signal?: AbortSignal) => parse((await api.get('/cart', { signal })).data)
export const addCartItem = async (input: AddCartItemInput) => parse((await api.post('/cart/items', input)).data)
export const updateCartItem = async ({ itemId, quantity }: { itemId: string; quantity: number }) =>
  parse((await api.patch(`/cart/items/${itemId}`, { quantity })).data)
export const removeCartItem = async (itemId: string) => parse((await api.delete(`/cart/items/${itemId}`)).data)
export const applyCoupon = async (code: string) => parse((await api.put('/cart/coupon', { code })).data)
export const removeCoupon = async () => parse((await api.delete('/cart/coupon')).data)
export const mergeGuestCart = async (guestCartId: string) =>
  cartSchema.parse((await api.post('/cart/merge', { guestCartId })).data)
