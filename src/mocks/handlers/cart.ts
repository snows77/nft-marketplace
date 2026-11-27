import { http, HttpResponse } from 'msw'
import Decimal from 'decimal.js'
import {
  addCartItemInputSchema,
  couponInputSchema,
  updateCartItemInputSchema,
  type Cart,
} from '@/contracts/cart'
import { getDb, saveDb } from '../db'
import { COUPONS, type DbCart } from '../db/fixtures/carts'
import { apiError, requireSession, validationError } from './auth'

// Taxa de rede estimada por pedido (Figma: "Taxa de rede 0.016 ETH — Taxa estimada")
export const NETWORK_FEE_ETH = '0.016'

const eth = (value: Decimal) => value.toDecimalPlaces(18).toFixed()

function touch(cart: DbCart) {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

function newCart(userId: string | null): DbCart {
  const cart: DbCart = {
    id: `cart-${crypto.randomUUID()}`,
    userId,
    items: [],
    couponCode: null,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  getDb().carts.push(cart)
  return cart
}

// Quem é o dono do carrinho desta requisição: o usuário logado (Authorization) ou o
// visitante (X-Cart-Id). Sessão inválida/expirada devolve o erro da sessão.
function resolveCart(request: Request, { create }: { create: boolean }): DbCart | Response | null {
  const db = getDb()
  if (request.headers.has('Authorization')) {
    const session = requireSession(request)
    if (session instanceof Response) return session
    return db.carts.find((c) => c.userId === session.user.id) ?? newCart(session.user.id)
  }
  const cartId = request.headers.get('X-Cart-Id')
  const guest = cartId ? db.carts.find((c) => c.id === cartId && c.userId === null) : undefined
  if (guest) return guest
  return create ? newCart(null) : null
}

// Monta a resposta com os preços e a disponibilidade ATUAIS do catálogo (a cotação)
export function toCartResponse(cart: DbCart): Cart {
  const nfts = getDb().nfts
  const items = cart.items.flatMap((item) => {
    const nft = nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    const unit = new Decimal(nft.priceEth)
    return [
      {
        id: item.id,
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        name: nft.name,
        tokenNumber: nft.tokenNumber,
        image: nft.image,
        quantity: item.quantity,
        available: edition.available,
        unitPriceEth: eth(unit),
        lineTotalEth: eth(unit.times(item.quantity)),
        previousUnitPriceEth: unit.equals(item.priceAtAddEth) ? null : item.priceAtAddEth,
        unavailable: item.quantity > edition.available,
      },
    ]
  })

  const subtotal = items.reduce((sum, item) => sum.plus(item.lineTotalEth), new Decimal(0))
  const coupon = COUPONS.find((c) => c.code === cart.couponCode && !c.expired) ?? null
  const discount = coupon ? subtotal.times(coupon.discountPercent).dividedBy(100) : new Decimal(0)
  const fee = items.length > 0 ? new Decimal(NETWORK_FEE_ETH) : new Decimal(0)

  return {
    id: cart.id,
    items,
    coupon: coupon && { code: coupon.code, label: coupon.label, discountPercent: coupon.discountPercent },
    subtotalEth: eth(subtotal),
    discountEth: eth(discount),
    networkFeeEth: eth(fee),
    totalEth: eth(subtotal.minus(discount).plus(fee)),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function checkAvailability(nftId: string, editionId: string, quantity: number): Response | null {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  if (!nft || !edition) return apiError(404, { code: 'NOT_FOUND', message: 'NFT ou edição não encontrada.' })
  if (edition.available === 0) {
    return apiError(409, { code: 'OUT_OF_STOCK', message: 'Esta edição está esgotada.' })
  }
  if (quantity > edition.available) {
    return apiError(409, {
      code: 'OUT_OF_STOCK',
      message: `Só há ${edition.available} disponíveis desta edição.`,
    })
  }
  return null
}

// Grava o banco só quando algo mudou. Cada aba tem sua cópia em memória: gravar numa
// leitura poderia sobrescrever, com dados antigos, o que outra aba acabou de salvar
// (ex.: a sessão de quem acabou de entrar lá).
const respond = (cart: DbCart, { persist = true }: { persist?: boolean } = {}) => {
  if (persist) saveDb()
  return HttpResponse.json(toCartResponse(cart))
}

export const cartHandlers = [
  http.get('/api/cart', ({ request }) => {
    const before = getDb().carts.length
    const cart = resolveCart(request, { create: true })
    if (cart instanceof Response) return cart
    // Só grava se a leitura criou um carrinho novo
    return respond(cart!, { persist: getDb().carts.length !== before })
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const parsed = addCartItemInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)
    const cart = resolveCart(request, { create: true })
    if (cart instanceof Response) return cart

    const { nftId, editionId, quantity } = parsed.data
    const line = cart!.items.find((i) => i.nftId === nftId && i.editionId === editionId)
    const problem = checkAvailability(nftId, editionId, (line?.quantity ?? 0) + quantity)
    if (problem) return problem

    if (line) line.quantity += quantity
    else {
      const price = getDb().nfts.find((n) => n.id === nftId)!.priceEth
      cart!.items.push({ id: `item-${crypto.randomUUID()}`, nftId, editionId, quantity, priceAtAddEth: price })
    }
    touch(cart!)
    return respond(cart!)
  }),

  http.patch('/api/cart/items/:itemId', async ({ request, params }) => {
    const parsed = updateCartItemInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)
    const cart = resolveCart(request, { create: false })
    if (cart instanceof Response) return cart
    const line = cart?.items.find((i) => i.id === params.itemId)
    if (!cart || !line) return apiError(404, { code: 'NOT_FOUND', message: 'Item não encontrado no carrinho.' })

    const problem = checkAvailability(line.nftId, line.editionId, parsed.data.quantity)
    if (problem) return problem
    line.quantity = parsed.data.quantity
    touch(cart)
    return respond(cart)
  }),

  http.delete('/api/cart/items/:itemId', ({ request, params }) => {
    const cart = resolveCart(request, { create: false })
    if (cart instanceof Response) return cart
    if (!cart) return apiError(404, { code: 'NOT_FOUND', message: 'Carrinho não encontrado.' })
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    touch(cart)
    return respond(cart)
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const parsed = couponInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)
    const cart = resolveCart(request, { create: true })
    if (cart instanceof Response) return cart

    const coupon = COUPONS.find((c) => c.code === parsed.data.code.toUpperCase())
    if (!coupon || coupon.expired) {
      return apiError(400, {
        code: 'VALIDATION_ERROR',
        message: coupon ? 'Cupom expirado.' : 'Cupom inválido.',
        fieldErrors: { code: [coupon ? 'Cupom expirado.' : 'Cupom inválido.'] },
      })
    }
    cart!.couponCode = coupon.code
    touch(cart!)
    return respond(cart!)
  }),

  http.delete('/api/cart/coupon', ({ request }) => {
    const cart = resolveCart(request, { create: true })
    if (cart instanceof Response) return cart
    cart!.couponCode = null
    touch(cart!)
    return respond(cart!)
  }),

  // Ao entrar: os itens do visitante passam para o carrinho do usuário (somando
  // quantidades até o limite disponível) e o carrinho do visitante é descartado
  http.post('/api/cart/merge', async ({ request }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    const body = (await request.json().catch(() => null)) as { guestCartId?: string } | null
    const db = getDb()
    const userCart = db.carts.find((c) => c.userId === session.user.id) ?? newCart(session.user.id)
    const guest = db.carts.find((c) => c.id === body?.guestCartId && c.userId === null)

    if (guest) {
      for (const item of guest.items) {
        const edition = db.nfts.find((n) => n.id === item.nftId)?.editions.find((e) => e.id === item.editionId)
        if (!edition || edition.available === 0) continue
        const line = userCart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
        if (line) line.quantity = Math.min(line.quantity + item.quantity, edition.available)
        else userCart.items.push({ ...item, quantity: Math.min(item.quantity, edition.available) })
      }
      if (!userCart.couponCode && guest.couponCode) userCart.couponCode = guest.couponCode
      db.carts = db.carts.filter((c) => c.id !== guest.id)
      touch(userCart)
    }
    return respond(userCart)
  }),
]
