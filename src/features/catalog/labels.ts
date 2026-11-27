import type { NftSummary } from '@/contracts/nft'
import type { NftSearch } from '@/contracts/nft-search'

type Category = NftSummary['category']
type Network = NftSummary['network']

export const CATEGORY_LABEL: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const TAB_LABEL: Record<NftSearch['tab'], string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const SORT_LABEL: Record<NftSearch['sort'], string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
}

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]
export const NETWORKS = Object.keys(NETWORK_LABEL) as Network[]

// "1.19" -> "1,19" (exibição pt-BR sem converter para number)
export const formatEthBr = (value: string) => value.replace('.', ',')
