import type { Query, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart } from '@/contracts/cart'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/events'
import type { Nft, NftListResponse, NftSummary } from '@/contracts/nft'
import type { Order } from '@/contracts/order'
import { formatEth } from '@/lib/format'
import { onReconnect, registerVersionLookup, subscribeEvent } from './client'

// Como cada evento atualiza o cache do TanStack Query (os componentes só leem o cache).
// Os eventos já chegam aqui validados, sem duplicatas e mais novos que o cache.

const isNftQuery = (query: Query) => query.queryKey[0] === 'nfts' || query.queryKey[0] === 'favorites'
const isCartQuery = (query: Query) => query.queryKey[0] === 'cart'
const isOrderQuery = (query: Query) => query.queryKey[0] === 'order'

// Listas que carregam NFTs: { items: [...] } (catálogo, favoritos) ou array (destaques, relacionados)
function summariesIn(data: unknown): NftSummary[] {
  if (Array.isArray(data)) return data as NftSummary[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: NftSummary[] }).items
  }
  if (data && typeof data === 'object' && 'priceEth' in data) return [data as NftSummary]
  return []
}

function patchNft<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.nftId) return nft
  const patched = { ...nft, priceEth: event.priceEth, version: event.version }
  if ('editions' in nft) {
    const editions = (nft as unknown as Nft).editions.map((edition) => {
      const next = event.editions.find((e) => e.id === edition.id)
      return next ? { ...edition, available: next.available } : edition
    })
    return { ...patched, editions }
  }
  return patched
}

function patchData(data: unknown, event: NftUpdatedEvent): unknown {
  if (Array.isArray(data)) return (data as NftSummary[]).map((nft) => patchNft(nft, event))
  if (data && typeof data === 'object' && Array.isArray((data as NftListResponse).items)) {
    const list = data as NftListResponse
    return { ...list, items: list.items.map((nft) => patchNft(nft, event)) }
  }
  if (data && typeof data === 'object' && 'priceEth' in data) return patchNft(data as Nft, event)
  return data
}

// NFTs da compra que o usuário acabou de confirmar (a liquidação emite nft.updated deles)
const ownPurchases = new Set<string>()

// Aviso acessível (o sonner anuncia em região aria-live) quando um item do carrinho mudou
function notifyCart(queryClient: QueryClient, event: NftUpdatedEvent) {
  const items = queryClient
    .getQueriesData<Cart>({ predicate: isCartQuery })
    .flatMap(([, cart]) => cart?.items ?? [])
    .filter((item) => item.nftId === event.nftId)
  const item = items[0]
  if (!item) return false
  // A disponibilidade caiu por causa da compra do próprio usuário: não é novidade para ele
  if (ownPurchases.has(event.nftId)) return true

  const soldOut = items.some((line) => {
    const edition = event.editions.find((e) => e.id === line.editionId)
    return edition !== undefined && edition.available < line.quantity
  })
  if (soldOut) {
    toast.warning(`${item.name}: a edição no seu carrinho esgotou ou ficou com menos unidades.`)
  } else if (item.unitPriceEth !== event.priceEth) {
    toast.info(`O preço de ${item.name} no seu carrinho mudou para ${formatEth(event.priceEth)}.`)
  }
  return true
}

export function installRealtimeSync(queryClient: QueryClient): () => void {
  // Versão que o REST já entregou (detalhe ou qualquer lista): evento igual ou mais velho é ignorado
  registerVersionLookup('nft.updated', (nftId) => {
    const versions = queryClient
      .getQueriesData({ predicate: isNftQuery })
      .flatMap(([, data]) => summariesIn(data))
      .filter((nft) => nft.id === nftId)
      .map((nft) => nft.version)
    return versions.length ? Math.max(...versions) : undefined
  })
  registerVersionLookup('order.updated', (orderId) => queryClient.getQueryData<Order>(['order', orderId])?.version)

  const offNft = subscribeEvent('nft.updated', (event) => {
    // Detalhe, catálogo, destaques, relacionados e favoritos: preço e disponibilidade
    queryClient.setQueriesData({ predicate: isNftQuery }, (data: unknown) => patchData(data, event))
    // Carrinho: a cotação é da API (preço anterior, indisponível, totais) → busca de novo
    const inCart = notifyCart(queryClient, event)
    if (inCart) void queryClient.invalidateQueries({ predicate: isCartQuery })
  })

  const offOrder = subscribeEvent('order.updated', (event: OrderUpdatedEvent) => {
    const key = ['order', event.orderId]
    if (event.status === 'confirmado') {
      const items = queryClient.getQueryData<Order>(key)?.items ?? []
      items.forEach((item) => ownPurchases.add(item.nftId))
      setTimeout(() => items.forEach((item) => ownPurchases.delete(item.nftId)), 10_000)
    }
    // Estado novo na hora; o restante (hash, recibo) vem do REST logo em seguida
    queryClient.setQueryData<Order>(key, (order) =>
      order ? { ...order, status: event.status, version: event.version, updatedAt: event.occurredAt } : order,
    )
    void queryClient.invalidateQueries({ queryKey: key })
  })

  // Reconexão: o que mudou durante a queda não chegou por evento → reconcilia com o REST
  // (só as queries ativas buscam de novo; as demais ficam marcadas como desatualizadas)
  const offReconnect = onReconnect(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => isNftQuery(query) || isCartQuery(query) || isOrderQuery(query),
    })
  })

  return () => {
    offNft()
    offOrder()
    offReconnect()
  }
}
