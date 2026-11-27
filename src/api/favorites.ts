import { api } from './client'
import { favoritesResponseSchema } from '@/contracts/favorite'

export async function fetchFavorites(signal?: AbortSignal) {
  const res = await api.get('/favorites', { signal })
  return favoritesResponseSchema.parse(res.data)
}

export async function addFavorite(nftId: string) {
  await api.put(`/favorites/${encodeURIComponent(nftId)}`)
}

export async function removeFavorite(nftId: string) {
  await api.delete(`/favorites/${encodeURIComponent(nftId)}`)
}
