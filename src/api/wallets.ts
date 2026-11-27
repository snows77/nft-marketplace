import { api } from './client'
import { walletSchema, walletsResponseSchema, type WalletInput, type WalletSlot } from '@/contracts/wallet'

export async function fetchWallets(signal?: AbortSignal) {
  const res = await api.get('/wallets', { signal })
  return walletsResponseSchema.parse(res.data)
}

// Cria ou substitui a carteira do slot
export async function saveWallet(slot: WalletSlot, input: WalletInput) {
  const res = await api.put(`/wallets/${slot}`, input)
  return walletSchema.parse(res.data)
}
