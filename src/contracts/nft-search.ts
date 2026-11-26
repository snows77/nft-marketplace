import { z } from 'zod'
import { ethString } from './common'
import { categorySchema, networkSchema } from './nft'

// O .catch() transforma valores inválidos na URL (ex.: ?page=abc) em valores padrão,
// em vez de quebrar a tela. O .default() torna a chave opcional para quem monta um link
// (ex.: <Link to="/" search={{ category: 'musica' }} />).
export const nftSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  tab: z.enum(['all', 'new', 'trending']).default('all').catch('all'),
  category: categorySchema.optional().catch(undefined),
  network: networkSchema.optional().catch(undefined),
  minPrice: ethString.optional().catch(undefined),
  maxPrice: ethString.optional().catch(undefined),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).default('recent').catch('recent'),
  page: z.coerce.number().int().min(1).default(1).catch(1),
})

export type NftSearch = z.infer<typeof nftSearchSchema>
export type NftSearchInput = z.input<typeof nftSearchSchema>