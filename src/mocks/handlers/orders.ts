import { delay, http, HttpResponse } from 'msw'
import { createOrderInputSchema, orderSchema, quoteSchema, type Order, type Quote } from '@/contracts/order'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/contracts/wallet'
import { getDb, saveDb } from '../db'
import { emitNftSnapshot, emitToUser, newEventId } from '../realtime/server'
import { getScenario, takeFailure } from '../scenario'
import { apiError, requireSession, validationError } from './auth'
import { toCartResponse } from './cart'

const QUOTE_TTL_MS = 10 * 60 * 1000
const DEFAULT_PAYMENT_DELAY_MS = 2000

export interface DbQuote extends Quote {
  userId: string
}

export interface DbOrder extends Order {
  userId: string
  settleAt: string // quando o "pagamento" termina (resultado calculado sob demanda)
}

export interface DbIdempotency {
  key: string
  userId: string
  bodyHash: string
  orderId: string
}

// Estado extra do checkout no banco simulado (criado sob demanda para não mudar o seed)
function store() {
  const db = getDb() as ReturnType<typeof getDb> & {
    quotes?: DbQuote[]
    orders?: DbOrder[]
    idempotency?: DbIdempotency[]
  }
  db.quotes ??= []
  db.orders ??= []
  db.idempotency ??= []
  return db as typeof db & { quotes: DbQuote[]; orders: DbOrder[]; idempotency: DbIdempotency[] }
}

// "Impressão digital" do que define o preço final: itens, preços, cupom, taxa e total
function fingerprint(q: Pick<Quote, 'items' | 'couponCode' | 'networkFeeEth' | 'totalEth'>): string {
  return JSON.stringify([
    q.items.map((i) => [i.nftId, i.editionId, i.quantity, i.unitPriceEth]),
    q.couponCode,
    q.networkFeeEth,
    q.totalEth,
  ])
}

// Cotação a partir do carrinho atual do usuário (preços e disponibilidade de agora)
function buildQuote(userId: string): DbQuote | Response {
  const cart = getDb().carts.find((c) => c.userId === userId)
  const view = cart ? toCartResponse(cart) : null
  if (!view || view.items.length === 0) {
    return apiError(400, { code: 'VALIDATION_ERROR', message: 'Seu carrinho está vazio.' })
  }
  const quote: DbQuote = {
    id: `quote-${crypto.randomUUID()}`,
    userId,
    items: view.items.map((i) => ({
      nftId: i.nftId,
      editionId: i.editionId,
      editionLabel: i.editionLabel,
      name: i.name,
      tokenNumber: i.tokenNumber,
      image: i.image,
      quantity: i.quantity,
      unitPriceEth: i.unitPriceEth,
      lineTotalEth: i.lineTotalEth,
    })),
    couponCode: view.coupon?.code ?? null,
    subtotalEth: view.subtotalEth,
    discountEth: view.discountEth,
    networkFeeEth: view.networkFeeEth,
    totalEth: view.totalEth,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
  const unavailable = view.items.find((i) => i.unavailable)
  if (unavailable) {
    return HttpResponse.json(
      {
        code: 'OUT_OF_STOCK',
        message: `${unavailable.name}: só há ${unavailable.available} disponíveis. Ajuste o carrinho.`,
        quote: publicQuote(quote),
      },
      { status: 409 },
    )
  }
  store().quotes.push(quote)
  return quote
}

// O schema público descarta os campos internos (userId, settleAt, outcome)
const publicQuote = (quote: DbQuote): Quote => quoteSchema.parse(quote)
const publicOrder = (order: DbOrder): Order => orderSchema.parse(order)

const EXPLORER: Record<string, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const fakeHash = () =>
  `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')}`

// Resolve o pagamento quando o prazo vence. Calculado sob demanda (em qualquer leitura),
// para o resultado existir mesmo se a página recarregar no meio do processo.
export function settleDueOrders(now = Date.now()): DbOrder[] {
  const db = store()
  const settled: DbOrder[] = []
  for (const order of db.orders) {
    if (order.status !== 'pendente' || new Date(order.settleAt).getTime() > now) continue
    const outcome = (order as DbOrder & { outcome?: string }).outcome ?? 'aprovar'
    const stamp = new Date().toISOString()

    // Confere a disponibilidade no momento da liquidação
    const lacking = order.items.find((item) => {
      const edition = db.nfts.find((n) => n.id === item.nftId)?.editions.find((e) => e.id === item.editionId)
      return !edition || edition.available < item.quantity
    })

    if (outcome === 'recusar' || lacking) {
      order.status = 'recusado'
      order.failureReason = lacking
        ? `${lacking.name} esgotou antes da confirmação. Nenhum valor foi cobrado.`
        : 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado.'
    } else {
      for (const item of order.items) {
        const nft = db.nfts.find((n) => n.id === item.nftId)!
        const edition = nft.editions.find((e) => e.id === item.editionId)!
        edition.available -= item.quantity
        nft.version += 1
      }
      // Remove do carrinho só o que foi comprado (itens adicionados depois continuam)
      const cart = db.carts.find((c) => c.userId === order.userId)
      if (cart) {
        for (const item of order.items) {
          const line = cart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
          if (line) line.quantity -= item.quantity
        }
        cart.items = cart.items.filter((i) => i.quantity > 0)
        if (cart.items.length === 0) cart.couponCode = null
        cart.version += 1
        cart.updatedAt = stamp
      }
      order.status = 'confirmado'
      order.transactionHash = fakeHash()
      order.explorerUrl = `${EXPLORER[order.payment.network]}${order.transactionHash}`
    }
    order.version += 1
    order.updatedAt = stamp
    settled.push(order)
  }
  if (settled.length) {
    saveDb()
    notifySettled(settled)
  }
  return settled
}

// Avisa pelo socket o que a liquidação mudou: o estado do pedido (só ao dono) e a
// disponibilidade dos NFTs comprados (a todos). Os eventos saem depois de gravar o
// banco, então REST e eventos contam a mesma história.
function notifySettled(orders: DbOrder[]) {
  const touchedNfts = new Set<string>()
  for (const order of orders) {
    emitToUser(order.userId, 'order.updated', {
      eventId: newEventId(),
      orderId: order.id,
      userId: order.userId,
      version: order.version,
      status: order.status,
      occurredAt: order.updatedAt,
    })
    if (order.status === 'confirmado') order.items.forEach((item) => touchedNfts.add(item.nftId))
  }
  touchedNfts.forEach((nftId) => emitNftSnapshot(nftId))
}

// O pagamento termina sozinho no servidor (sem depender de alguém consultar o pedido):
// um timer até settleAt liquida e emite os eventos. Se a página recarregar antes, a
// próxima leitura liquida e emite do mesmo jeito.
function scheduleSettlement(order: DbOrder) {
  const wait = Math.max(0, new Date(order.settleAt).getTime() - Date.now())
  setTimeout(() => settleDueOrders(), wait + 10)
}

// Na partida dos mocks (ex.: depois de um refresh): reagenda os pedidos ainda pendentes
export function resumePendingSettlements(): void {
  store()
    .orders.filter((order) => order.status === 'pendente')
    .forEach(scheduleSettlement)
}

export const orderHandlers = [
  // Simulação de conexão da carteira cadastrada (aceita ou recusa conforme o cenário)
  http.post('/api/wallets/connect', async ({ request }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    const body = (await request.json().catch(() => null)) as { slot?: string } | null
    const wallet = getDb().wallets.find((w) => w.userId === session.user.id && w.slot === body?.slot)
    if (!wallet) return apiError(404, { code: 'NOT_FOUND', message: 'Carteira não cadastrada.' })
    if (getScenario().walletOutcome === 'recusar') {
      return apiError(403, { code: 'FORBIDDEN', message: 'A carteira recusou a conexão. Tente novamente ou escolha outra.' })
    }
    return HttpResponse.json({ connected: true, slot: wallet.slot, address: wallet.address })
  }),

  http.post('/api/checkout/quote', ({ request }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    const quote = buildQuote(session.user.id)
    if (quote instanceof Response) return quote
    saveDb()
    return HttpResponse.json(publicQuote(quote))
  }),

  http.post('/api/orders', async ({ request }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    const userId = session.user.id
    const key = request.headers.get('Idempotency-Key')
    if (!key) return apiError(400, { code: 'VALIDATION_ERROR', message: 'Chave de idempotência ausente.' })

    const raw = await request.text()
    const db = store()

    // Mesma tentativa (mesma chave e mesmo conteúdo) recupera o mesmo pedido
    const previous = db.idempotency.find((r) => r.key === key && r.userId === userId)
    if (previous) {
      if (previous.bodyHash !== raw) {
        return apiError(409, {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Esta tentativa já foi usada com outros dados. Revise e confirme novamente.',
        })
      }
      settleDueOrders()
      const existing = db.orders.find((o) => o.id === previous.orderId)!
      return HttpResponse.json(publicOrder(existing))
    }

    const parsed = createOrderInputSchema.safeParse(JSON.parse(raw || 'null'))
    if (!parsed.success) return validationError(parsed.error)
    const { quoteId, buyer, payment } = parsed.data

    const wallet = getDb().wallets.find((w) => w.userId === userId && w.slot === payment.walletSlot)
    if (!wallet) return apiError(400, { code: 'VALIDATION_ERROR', message: 'Escolha uma carteira cadastrada.' })

    // Revalida a cotação contra o carrinho e o catálogo de agora
    const accepted = db.quotes.find((q) => q.id === quoteId && q.userId === userId)
    const fresh = buildQuote(userId)
    if (fresh instanceof Response) return fresh
    const expired = !accepted || new Date(accepted.expiresAt).getTime() < Date.now()
    if (expired || fingerprint(accepted) !== fingerprint(fresh)) {
      saveDb()
      return HttpResponse.json(
        {
          code: 'PRICE_CHANGED',
          message: expired
            ? 'Sua cotação expirou. Revise os valores e confirme novamente.'
            : 'Preço, disponibilidade, cupom ou taxas mudaram. Revise e confirme novamente.',
          quote: publicQuote(fresh),
        },
        { status: 409 },
      )
    }

    const now = new Date()
    const scenario = getScenario()
    const order: DbOrder & { outcome: string } = {
      id: `pedido-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      status: 'pendente',
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      items: accepted.items,
      subtotalEth: accepted.subtotalEth,
      discountEth: accepted.discountEth,
      networkFeeEth: accepted.networkFeeEth,
      totalEth: accepted.totalEth,
      couponCode: accepted.couponCode,
      payment: {
        ...payment,
        walletLabel: `${wallet.label} · ${PROVIDER_LABELS[payment.provider]} · ${NETWORK_LABELS[payment.network]}`,
        address: wallet.address,
      },
      buyer,
      transactionHash: null,
      explorerUrl: null,
      failureReason: null,
      settleAt: new Date(now.getTime() + (scenario.paymentDelayMs ?? DEFAULT_PAYMENT_DELAY_MS)).toISOString(),
      outcome: scenario.paymentOutcome ?? 'aprovar',
    }
    db.orders.push(order)
    db.idempotency.push({ key, userId, bodyHash: raw, orderId: order.id })
    db.quotes = db.quotes.filter((q) => q.id !== quoteId) // cotação usada
    saveDb()
    scheduleSettlement(order)

    // Cenário "timeout depois de criar": o pedido existe, mas a resposta não chega a tempo
    if (takeFailure('POST', '/api/orders', ['timeout-apos-criar'])) {
      await delay(15_000)
      return apiError(503, { code: 'TRANSIENT_ERROR', message: 'Serviço temporariamente indisponível.' })
    }
    return HttpResponse.json(publicOrder(order), { status: 201 })
  }),

  http.get('/api/orders', ({ request }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    settleDueOrders()
    const mine = store().orders.filter((o) => o.userId === session.user.id).map(publicOrder)
    return HttpResponse.json({ items: mine.reverse() })
  }),

  http.get('/api/orders/:orderId', ({ request, params }) => {
    const session = requireSession(request)
    if (session instanceof Response) return session
    settleDueOrders()
    const order = store().orders.find((o) => o.id === params.orderId && o.userId === session.user.id)
    // Pedido de outra pessoa responde como inexistente (não revela que existe)
    if (!order) return apiError(404, { code: 'NOT_FOUND', message: 'Pedido não encontrado.' })
    return HttpResponse.json(publicOrder(order))
  }),
]
