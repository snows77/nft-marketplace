import type { NftSearch } from '@/contracts/nft-search'

// Toda chave de query nasce aqui. Quando existir usuário, as chaves
// privadas (carrinho, favoritos...) vão incluir o userId.
export const nftKeys = {
  all: ['nfts'] as const,
  list: (params: NftSearch) => ['nfts', 'list', params] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
}