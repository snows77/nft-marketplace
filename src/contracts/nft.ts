import { z } from 'zod'
import { ethString } from './common'

export const categorySchema = z.enum([
  'arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis',
  'generativa', 'jogos', 'assinaturas', 'utilidade',
])
export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export const raritySchema = z.enum(['comum', 'raro', 'epico', 'lendario'])

export const editionSchema = z.object({
  id: z.string(),
  label: z.string(),                       // "1/50", "ABERTA"
  supply: z.number().int().nullable(),     // null = edição aberta
  available: z.number().int().min(0),
})

// Avaliação de colecionador (amostra exibida na aba "Avaliações de colecionadores")
export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(), // ISO
})

// Dados do card (listagem, destaques, "mais desta coleção")
export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),                        // "Emerald Ape"
  tokenNumber: z.number().int(),           // exibido como #042
  image: z.string(),
  priceEth: ethString,
  originalPriceEth: ethString.nullable(),  // preço riscado
  rarity: raritySchema,
  category: categorySchema,
  network: networkSchema,
  featured: z.boolean(),
  version: z.number().int(),
})

// Dados completos (página de detalhe)
export const nftSchema = nftSummarySchema.extend({
  collection: z.string(),
  creator: z.string(),
  summary: z.string(),
  description: z.string(),
  gallery: z.array(z.string()),
  attributes: z.array(z.string()),
  editions: z.array(editionSchema),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int(),
  reviews: z.array(reviewSchema),          // amostra das mais recentes (reviewCount é o total)
  royaltyPercent: z.number(),
  contractAddress: z.string(),
  tokenStandard: z.string(),               // "ERC-721"
  createdAt: z.string(),                   // ISO, base de "Novos lançamentos"
  trendingScore: z.number(),               // base de "Em alta"
})

// Parâmetros de busca (vão para a URL e para a API)
export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  tab: z.enum(['all', 'new', 'trending']).default('all'),
  category: categorySchema.optional(),
  network: networkSchema.optional(),
  minPrice: ethString.optional(),
  maxPrice: ethString.optional(),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).default('recent'),
  page: z.number().int().min(1).default(1),
})

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({
    categories: z.record(z.string(), z.number().int()),
    networks: z.record(z.string(), z.number().int()),
    priceRange: z.object({ min: ethString, max: ethString }),
  }),
})

export type Nft = z.infer<typeof nftSchema>
export type NftSummary = z.infer<typeof nftSummarySchema>
export type NftEdition = z.infer<typeof editionSchema>
export type NftReview = z.infer<typeof reviewSchema>
export type NftListQuery = z.infer<typeof nftListQuerySchema>
export type NftListResponse = z.infer<typeof nftListResponseSchema>
// GET /api/nfts/featured: destaques do Início (hero e "NFT em destaque")
export const featuredResponseSchema = z.array(nftSummarySchema)
