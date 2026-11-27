import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { connectWallet, createOrder, createQuote, fetchOrder } from '@/api/orders'
import { ApiRequestError } from '@/api/errors'
import { cartKeys } from '@/api/queryKeys'
import { staleQuoteSchema, type Buyer, type Order, type Payment, type Quote } from '@/contracts/order'
import type { WalletSlot } from '@/contracts/wallet'
import { useSocketEvent } from '@/features/realtime/useSocketEvent'
import { attemptFor, loadAttempt, saveAttempt } from './attempt'

export type Connection = { state: 'desconectada' | 'conectando' | 'conectada' } | { state: 'erro'; message: string }

const orderKey = (orderId: string | undefined) => ['order', orderId ?? 'nenhum'] as const

// Pendente, ou "confirmado" sem a transação ainda (evento chegou antes do REST)
export const isAwaitingConfirmation = (order: Order | undefined) =>
  !!order && (order.status === 'pendente' || (order.status === 'confirmado' && !order.transactionHash))

// Fluxo do checkout: conectar carteira → revisar (cotação) → confirmar (pedido idempotente)
// → acompanhar o pendente até confirmado/recusado. Toda regra de negócio fica na API.
export function useCheckout(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [connection, setConnection] = useState<Connection>({ state: 'desconectada' })
  const [quote, setQuote] = useState<Quote | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Retoma um pedido pendente desta sessão (ex.: a página foi recarregada)
  const [orderId, setOrderId] = useState<string | undefined>(() => loadAttempt(userId)?.orderId)

  const connect = useMutation({
    mutationFn: (slot: WalletSlot) => connectWallet(slot),
    onMutate: () => setConnection({ state: 'conectando' }),
    onSuccess: () => setConnection({ state: 'conectada' }),
    onError: (err) =>
      setConnection({
        state: 'erro',
        message: err instanceof ApiRequestError ? err.message : 'Não foi possível conectar a carteira.',
      }),
  })

  // Já existe um pedido em processamento (outra aba, ou revisão depois de um timeout):
  // a API recusa outro e devolve o id; o checkout passa a acompanhar esse pedido
  function resumePendingOrder(err: unknown): boolean {
    if (!(err instanceof ApiRequestError) || err.code !== 'ORDER_PENDING') return false
    const pendingId = (err.details as { orderId?: string } | undefined)?.orderId
    if (!pendingId) return false
    saveAttempt(userId, { key: crypto.randomUUID(), quoteId: '', orderId: pendingId })
    setOrderId(pendingId)
    return true
  }

  const review = useMutation({
    mutationFn: createQuote,
    onMutate: () => setNotice(null),
    onSuccess: (q) => setQuote(q),
    onError: (err) => {
      if (resumePendingOrder(err)) return
      const stale = staleQuoteSchema.safeParse(err instanceof ApiRequestError ? err.details : null)
      if (stale.success) setQuote(stale.data.quote)
      setNotice(err instanceof ApiRequestError ? err.message : 'Não foi possível gerar a cotação.')
    },
  })

  const confirm = useMutation({
    mutationFn: async ({ buyer, payment }: { buyer: Buyer; payment: Payment }) => {
      const attempt = attemptFor(userId, quote!.id)
      const send = () => createOrder({ quoteId: quote!.id, buyer, payment }, attempt.key)
      try {
        return await send()
      } catch (err) {
        // Resposta perdida (timeout/queda): reenvia UMA vez com a MESMA chave. Se o pedido
        // chegou a ser criado, a API devolve o mesmo pedido em vez de criar outro.
        const lost = err instanceof ApiRequestError && (err.code === 'TIMEOUT' || err.code === 'NETWORK_ERROR' || err.code === 'TRANSIENT_ERROR')
        if (!lost) throw err
        return await send()
      }
    },
    onMutate: () => setNotice(null),
    onSuccess: (order) => {
      saveAttempt(userId, { ...attemptFor(userId, quote!.id), orderId: order.id })
      queryClient.setQueryData(orderKey(order.id), order)
      setOrderId(order.id)
    },
    onError: (err) => {
      if (resumePendingOrder(err)) return
      if (!(err instanceof ApiRequestError)) return setNotice('Não foi possível enviar o pedido.')
      // Valores mudaram: mostra a cotação nova e exige nova confirmação (nova tentativa)
      const stale = staleQuoteSchema.safeParse(err.details)
      if (stale.success) setQuote(stale.data.quote)
      if (err.code === 'IDEMPOTENCY_CONFLICT') saveAttempt(userId, null)
      setNotice(
        err.code === 'TIMEOUT' || err.code === 'NETWORK_ERROR' || err.code === 'TRANSIENT_ERROR'
          ? 'Não conseguimos confirmar o envio. Tente de novo: se o pedido já existir, ele será recuperado.'
          : err.message,
      )
    },
  })

  // Tempo real: um item da cotação em revisão mudou de preço ou disponibilidade. Avisa já;
  // a API recusa a confirmação dessa cotação (PRICE_CHANGED) e devolve a nova.
  useSocketEvent('nft.updated', (event) => {
    if (!quote || orderId) return
    const changed = quote.items.find((item) => {
      if (item.nftId !== event.nftId) return false
      const edition = event.editions.find((e) => e.id === item.editionId)
      return item.unitPriceEth !== event.priceEth || (edition !== undefined && edition.available < item.quantity)
    })
    if (changed) {
      setNotice(`O preço ou a disponibilidade de ${changed.name} mudou. Revise e confirme novamente.`)
    }
  })

  // Acompanha o pedido enquanto estiver pendente. O evento order.updated atualiza o mesmo
  // cache na hora (src/features/realtime/sync.ts); o polling fica como reserva.
  const order = useQuery({
    queryKey: orderKey(orderId),
    queryFn: ({ signal }) => fetchOrder(orderId!, signal),
    enabled: !!orderId,
    // Continua consultando até a confirmação chegar completa (com a transação): um evento
    // pode marcar "confirmado" no cache antes de o REST trazer o hash
    refetchInterval: (query) => (isAwaitingConfirmation(query.state.data) ? 1000 : false),
  })

  const confirmed = order.data?.status === 'confirmado' && !!order.data.transactionHash
  const status = order.data?.status
  useEffect(() => {
    if (!confirmed || !orderId) return
    // Pedido confirmado: encerra a tentativa, atualiza o carrinho e mostra o recibo
    saveAttempt(userId, null)
    void queryClient.invalidateQueries({ queryKey: cartKeys.detail(userId) })
    void navigate({ to: '/pedidos/$orderId', params: { orderId }, replace: true })
  }, [confirmed, orderId, userId, queryClient, navigate])

  function acknowledgeRefusal() {
    saveAttempt(userId, null)
    setOrderId(undefined)
    setQuote(null)
  }

  return {
    connection,
    disconnect: () => setConnection({ state: 'desconectada' }),
    connect,
    quote,
    clearQuote: () => setQuote(null),
    review,
    confirm,
    notice,
    order: order.data,
    orderError: order.error,
    pending: !!orderId && (order.isPending || isAwaitingConfirmation(order.data)),
    refused: status === 'recusado',
    acknowledgeRefusal,
  }
}
