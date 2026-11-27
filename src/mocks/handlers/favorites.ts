import { http, HttpResponse } from 'msw'
import { nftSummarySchema } from '@/contracts/nft'
import type { FavoritesResponse } from '@/contracts/favorite'
import { getDb, saveDb } from '../db'
import { apiError, requireSession } from './auth'

function nftExists(id: string): boolean {
  return getDb().nfts.some((n) => n.id === id)
}

function notFound() {
  return apiError(404, { code: 'NOT_FOUND', message: 'NFT não encontrado' })
}

// Favoritos são privados: toda rota passa por requireSession e usa só o usuário da sessão
export const favoriteHandlers = [
  http.get('/api/favorites', ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const db = getDb()
    const ids = db.favorites[result.user.id] ?? []
    const items = ids
      .map((id) => db.nfts.find((n) => n.id === id))
      .filter((n) => n !== undefined)
      .map((n) => nftSummarySchema.parse(n))
    const body: FavoritesResponse = { items }
    return HttpResponse.json(body)
  }),

  // Idempotente: favoritar de novo não duplica
  http.put('/api/favorites/:nftId', ({ request, params }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const nftId = String(params.nftId)
    if (!nftExists(nftId)) return notFound()
    const db = getDb()
    const current = db.favorites[result.user.id] ?? []
    if (!current.includes(nftId)) db.favorites[result.user.id] = [nftId, ...current]
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),

  // Idempotente: remover o que não está nos favoritos também responde 204
  http.delete('/api/favorites/:nftId', ({ request, params }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const nftId = String(params.nftId)
    if (!nftExists(nftId)) return notFound()
    const db = getDb()
    db.favorites[result.user.id] = (db.favorites[result.user.id] ?? []).filter((id) => id !== nftId)
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
