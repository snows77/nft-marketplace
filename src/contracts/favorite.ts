import { z } from 'zod'
import { nftSummarySchema } from './nft'

// GET /api/favorites: NFTs favoritados pelo usuário da sessão (mais recente primeiro).
// PUT /api/favorites/:nftId e DELETE /api/favorites/:nftId respondem 204 (idempotentes).
export const favoritesResponseSchema = z.object({
  items: z.array(nftSummarySchema),
})

export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>
