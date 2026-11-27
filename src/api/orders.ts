import { api } from './client'
import { orderSchema, quoteSchema, type CreateOrderInput } from '@/contracts/order'
import type { WalletSlot } from '@/contracts/wallet'

export async function connectWallet(slot: WalletSlot) {
  await api.post('/wallets/connect', { slot })
}

export async function createQuote() {
  return quoteSchema.parse((await api.post('/checkout/quote')).data)
}

// A chave de idempotência identifica a TENTATIVA: reenviar com a mesma chave (clique
// repetido, timeout) recupera o mesmo pedido em vez de criar outro
export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  const res = await api.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
  return orderSchema.parse(res.data)
}

export async function fetchOrder(orderId: string, signal?: AbortSignal) {
  return orderSchema.parse((await api.get(`/orders/${orderId}`, { signal })).data)
}
