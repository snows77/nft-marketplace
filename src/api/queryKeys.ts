import type { NftSearch } from '@/contracts/nft-search'

// Toda chave de query nasce aqui. Chaves privadas incluem o id do usuário:
// dados de uma pessoa nunca são servidos do cache para outra.
export const nftKeys = {
  all: ['nfts'] as const,
  list: (params: NftSearch) => ['nfts', 'list', params] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
  featured: ['nfts', 'featured'] as const,
}

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
}
