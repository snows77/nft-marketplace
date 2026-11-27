import { api } from './client'
import {
  featuredResponseSchema,
  nftListResponseSchema,
  nftSchema,
  nftSummarySchema,
  type NftListQuery,
} from '@/contracts/nft'

export async function fetchNfts(query: Partial<NftListQuery>, signal?: AbortSignal) {
  const res = await api.get('/nfts', { params: query, signal })
  return nftListResponseSchema.parse(res.data) // valida o contrato na chegada
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const res = await api.get(`/nfts/${encodeURIComponent(id)}`, { signal })
  return nftSchema.parse(res.data)
}
// GET /api/nfts/:id/related: outros NFTs da mesma coleção
export async function fetchRelatedNfts(id: string, signal?: AbortSignal) {
  const res = await api.get(`/nfts/${encodeURIComponent(id)}/related`, { signal })
  return nftSummarySchema.array().parse(res.data)
}

export async function fetchFeaturedNfts(signal?: AbortSignal) {
  const res = await api.get('/nfts/featured', { signal })
  return featuredResponseSchema.parse(res.data)
}
