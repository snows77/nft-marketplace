import { http, HttpResponse } from 'msw'
import {
  SLOT_LABELS,
  sameAddress,
  walletInputSchema,
  walletSlotSchema,
  type Wallet,
  type WalletSlot,
} from '@/contracts/wallet'
import { getDb, saveDb } from '../db'
import type { DbWallet } from '../db/fixtures/wallets'
import { apiError, requireSession, validationError } from './auth'

function toWallet({ id, slot, label, provider, network, address, updatedAt }: DbWallet): Wallet {
  return { id, slot, label, provider, network, address, updatedAt }
}

function findWallet(userId: string, slot: WalletSlot): DbWallet | undefined {
  return getDb().wallets.find((w) => w.userId === userId && w.slot === slot)
}

export const walletHandlers = [
  http.get('/api/wallets', ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const principal = findWallet(result.user.id, 'principal')
    const secundaria = findWallet(result.user.id, 'secundaria')
    return HttpResponse.json({
      principal: principal ? toWallet(principal) : null,
      secundaria: secundaria ? toWallet(secundaria) : null,
    })
  }),

  // Cria ou substitui a carteira do slot (principal ou secundária)
  http.put('/api/wallets/:slot', async ({ request, params }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const slot = walletSlotSchema.safeParse(params.slot)
    if (!slot.success) return apiError(404, { code: 'NOT_FOUND', message: 'Carteira inexistente.' })
    const parsed = walletInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const userId = result.user.id
    const input = parsed.data
    const otherSlot: WalletSlot = slot.data === 'principal' ? 'secundaria' : 'principal'
    const other = findWallet(userId, otherSlot)
    if (other && sameAddress(other.address, input.address)) {
      return apiError(409, {
        code: 'CONFLICT',
        message: 'Este endereço já está cadastrado.',
        fieldErrors: { address: [`Este endereço já está na sua ${SLOT_LABELS[otherSlot].toLowerCase()}.`] },
      })
    }

    const db = getDb()
    const existing = findWallet(userId, slot.data)
    const wallet: DbWallet = {
      id: existing?.id ?? `wallet-${crypto.randomUUID()}`,
      userId,
      slot: slot.data,
      ...input,
      updatedAt: new Date().toISOString(),
    }
    db.wallets = [...db.wallets.filter((w) => w !== existing), wallet]
    saveDb()
    return HttpResponse.json(toWallet(wallet), { status: existing ? 200 : 201 })
  }),
]
