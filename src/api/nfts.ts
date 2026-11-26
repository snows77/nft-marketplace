import { api } from './client'
import {
  nftListResponseSchema,
  nftSchema,
  type NftListQuery,
} from '@/contracts/nft'

export async function fetchNfts(query: Partial<NftListQuery>, signal?: AbortSignal) {
  const res = await api.get('/nfts', { params: query, signal })
  return nftListResponseSchema.parse(res.data) // valida o contrato na chegada
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const res = await api.get(`/nfts/${id}`, { signal })
  return nftSchema.parse(res.data)
}