import { z } from 'zod'
import { ethString } from './common'
import { categorySchema, networkSchema } from './nft'

// O .catch() transforma valores inválidos na URL (ex.: ?page=abc) em valores padrão,
// em vez de quebrar a tela.
export const nftSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  tab: z.enum(['all', 'new', 'trending']).catch('all'),
  category: categorySchema.optional().catch(undefined),
  network: networkSchema.optional().catch(undefined),
  minPrice: ethString.optional().catch(undefined),
  maxPrice: ethString.optional().catch(undefined),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).catch('recent'),
  page: z.coerce.number().int().min(1).catch(1),
})

export type NftSearch = z.infer<typeof nftSearchSchema>