import Decimal from 'decimal.js'
import { getGuestCartId, getToken } from '@/api/token'
import { getDb } from '../db'
import { updateNft } from './server'

// Ações do painel de demonstração: mudam o primeiro item do carrinho de quem está usando
// a página (usuário logado ou visitante). Passam pelo banco + evento, como qualquer mudança.

function firstCartItem() {
  const db = getDb()
  const token = getToken()
  const session = token ? db.sessions.find((s) => s.token === token) : undefined
  const cart = session
    ? db.carts.find((c) => c.userId === session.userId)
    : db.carts.find((c) => c.id === getGuestCartId() && c.userId === null)
  return cart?.items[0] ?? null
}

// +10% no preço do NFT do primeiro item do carrinho. Devolve false se o carrinho está vazio.
export function raiseFirstCartItemPrice(): boolean {
  const item = firstCartItem()
  const nft = item && getDb().nfts.find((n) => n.id === item.nftId)
  if (!item || !nft) return false
  const price = new Decimal(nft.priceEth).times(1.1).toDecimalPlaces(4).toFixed()
  updateNft(nft.id, { priceEth: price })
  return true
}

// Esgota a edição do primeiro item do carrinho
export function soldOutFirstCartItem(): boolean {
  const item = firstCartItem()
  if (!item) return false
  updateNft(item.nftId, { editions: [{ id: item.editionId, available: 0 }] })
  return true
}
