import { http, HttpResponse } from 'msw'
import Decimal from 'decimal.js'
import {
  nftListQuerySchema,
  nftSummarySchema,
  type Nft,
  type NftListQuery,
  type NftListResponse,
} from '@/contracts/nft'
import { getDb } from '../db'

const PAGE_SIZE = 9

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function parseQuery(url: URL) {
  const p = url.searchParams
  return nftListQuerySchema.safeParse({
    q: p.get('q') || undefined,
    tab: p.get('tab') ?? undefined,
    category: p.get('category') ?? undefined,
    network: p.get('network') ?? undefined,
    minPrice: p.get('minPrice') ?? undefined,
    maxPrice: p.get('maxPrice') ?? undefined,
    sort: p.get('sort') ?? undefined,
    page: p.has('page') ? Number(p.get('page')) : undefined,
  })
}

// "omit" ignora um filtro, para calcular as contagens (facets) daquela dimensão
function matches(nft: Nft, query: NftListQuery, omit?: 'category' | 'network'): boolean {
  if (query.q) {
    const haystack = normalize(`${nft.name} ${nft.collection} ${nft.creator}`)
    if (!haystack.includes(normalize(query.q))) return false
  }
  if (omit !== 'category' && query.category && nft.category !== query.category) return false
  if (omit !== 'network' && query.network && nft.network !== query.network) return false
  const price = new Decimal(nft.priceEth)
  if (query.minPrice && price.lt(query.minPrice)) return false
  if (query.maxPrice && price.gt(query.maxPrice)) return false
  return true
}

function sortNfts(items: Nft[], query: NftListQuery): Nft[] {
  const sorted = [...items]
  // As abas "Novos lançamentos" e "Em alta" definem a própria ordenação
  if (query.tab === 'new') return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (query.tab === 'trending') return sorted.sort((a, b) => b.trendingScore - a.trendingScore)

  switch (query.sort) {
    case 'price-asc':
      return sorted.sort((a, b) => new Decimal(a.priceEth).comparedTo(b.priceEth))
    case 'price-desc':
      return sorted.sort((a, b) => new Decimal(b.priceEth).comparedTo(a.priceEth))
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

function countBy(items: Nft[], key: 'category' | 'network'): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) counts[item[key]] = (counts[item[key]] ?? 0) + 1
  return counts
}

export const nftHandlers = [
  // Antes de /api/nfts/:id, senão "featured" seria lido como um id
  http.get('/api/nfts/featured', () => {
    const items = getDb()
      .nfts.filter((n) => n.featured)
      .map((n) => nftSummarySchema.parse(n))
    return HttpResponse.json(items)
  }),

  http.get('/api/nfts', ({ request }) => {
    const parsed = parseQuery(new URL(request.url))

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_')
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Parâmetros inválidos', fieldErrors },
        { status: 400 },
      )
    }

    const query = parsed.data
    const all = getDb().nfts

    const filtered = sortNfts(all.filter((n) => matches(n, query)), query)
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = (query.page - 1) * PAGE_SIZE
    const items = filtered.slice(start, start + PAGE_SIZE).map((n) => nftSummarySchema.parse(n))

    const prices = all.map((n) => new Decimal(n.priceEth))
    const body: NftListResponse = {
      items,
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
      facets: {
        categories: countBy(all.filter((n) => matches(n, query, 'category')), 'category'),
        networks: countBy(all.filter((n) => matches(n, query, 'network')), 'network'),
        priceRange: {
          min: Decimal.min(...prices).toFixed(),
          max: Decimal.max(...prices).toFixed(),
        },
      },
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/:id', ({ params }) => {
    const nft = getDb().nfts.find((n) => n.id === params.id)
    if (!nft) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'NFT não encontrado' },
        { status: 404 },
      )
    }
    return HttpResponse.json(nft)
  }),
]