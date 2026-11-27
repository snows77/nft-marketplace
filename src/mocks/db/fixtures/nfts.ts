import type { Nft } from '@/contracts/nft'

type Category = Nft['category']
type Network = Nft['network']
type Rarity = Nft['rarity']

const TOTAL = 60

const CATEGORIES: Category[] = [
  'arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis',
  'generativa', 'jogos', 'assinaturas', 'utilidade',
]
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana',
}
const RARITY_LABEL: Record<Rarity, string> = {
  comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
}

const IMAGE_KEYS = ['emerald-ape', 'sage-nomad', 'ivory-baron', 'golden-beat']
const ADJECTIVES = [
  'Cosmic', 'Violet', 'Neon', 'Ivory', 'Golden', 'Emerald',
  'Sage', 'Amber', 'Onyx', 'Crimson', 'Azure', 'Lunar',
]
const NOUNS = ['Ape', 'Nomad', 'Vessel', 'Baron', 'Bloom', 'Beat', 'Signal', 'Echo', 'Drift']
const COLLECTIONS = ['Kurio Apes', 'Kurio Nomads', 'Kurio Echoes']
const CREATORS = ['Nova Sato', 'Iris Bell', 'Teo Marques', 'Lia Okafor']
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Chapéu', 'Fones', 'Jaqueta', 'Capuz']

const img = (key: string) => `/images/nfts/${key}.webp`

// Centavos de ETH -> "1.19". Aritmética inteira, sem float.
function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

const hex4 = (n: number) => (n % 65536).toString(16).padStart(4, '0').toUpperCase()

interface Seed {
  name: string
  token: number
  cents: number
  originalCents?: number
  image: string
  rarity: Rarity
}

// Os 8 primeiros reproduzem os cards do Figma
const FIGMA_SEEDS: Seed[] = [
  { name: 'Emerald Ape', token: 42, cents: 119, image: 'emerald-ape', rarity: 'raro' },
  { name: 'Sage Nomad', token: 9, cents: 169, image: 'sage-nomad', rarity: 'comum' },
  { name: 'Neon Vessel', token: 552, cents: 199, originalCents: 229, image: 'ivory-baron', rarity: 'comum' },
  { name: 'Cosmic Bloom', token: 118, cents: 129, image: 'sage-nomad', rarity: 'comum' },
  { name: 'Violet Nomad', token: 314, cents: 139, image: 'sage-nomad', rarity: 'comum' },
  { name: 'Ivory Baron', token: 88, cents: 179, image: 'ivory-baron', rarity: 'raro' },
  { name: 'Golden Beat', token: 207, cents: 99, image: 'golden-beat', rarity: 'comum' },
  { name: 'Golden Signal', token: 160, cents: 39, image: 'golden-beat', rarity: 'comum' },
]

export function buildNfts(): Nft[] {
  return Array.from({ length: TOTAL }, (_, i) => {
    const seed = FIGMA_SEEDS[i]
    const id = `nft-${String(i + 1).padStart(3, '0')}`

    const name = seed?.name ?? `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[(i * 5) % NOUNS.length]}`
    const tokenNumber = seed?.token ?? ((i * 53 + 7) % 900) + 1
    const cents = seed?.cents ?? 2 + ((i * 173) % 1229) // 0.02 a 12.30 ETH
    const originalCents = seed ? seed.originalCents : i % 6 === 2 ? cents + 30 : undefined
    const imageUrl = img(seed?.image ?? IMAGE_KEYS[i % IMAGE_KEYS.length])
    const rarity: Rarity =
      seed?.rarity ??
      (i % 11 === 0 ? 'lendario' : i % 5 === 0 ? 'epico' : i % 3 === 0 ? 'raro' : 'comum')

    const category = CATEGORIES[i % CATEGORIES.length]
    // Rede descorrelacionada da categoria: toda combinação categoria × rede existe
    const network = NETWORKS[(i + Math.floor(i / CATEGORIES.length)) % NETWORKS.length]
    const collection = COLLECTIONS[i % COLLECTIONS.length]
    const creator = CREATORS[i % CREATORS.length]

    return {
      id,
      name,
      tokenNumber,
      image: imageUrl,
      priceEth: fromCents(cents),
      originalPriceEth: originalCents ? fromCents(originalCents) : null,
      rarity,
      category,
      network,
      // Destaques: Emerald Ape (hero do Figma), Sage Nomad (card "NFT em destaque") e mais dois
      featured: i === 0 || i === 1 || i === 20 || i === 40,
      version: 1,

      collection,
      creator,
      summary: `Um colecionável digital 1/50 finalizado à mão da coleção ${collection}, verificado na ${NETWORK_LABEL[network]}.`,
      description:
        `${name} #${String(tokenNumber).padStart(3, '0')} é uma obra digital finalizada à mão da coleção ${collection}. ` +
        `Cada atributo fica armazenado nos metadados do token e verificado na ${NETWORK_LABEL[network]}.\n\n` +
        `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. ` +
        `${creator} recebe 5% de direitos autorais nas vendas secundárias.`,
      gallery: Array.from({ length: 4 }, () => imageUrl),
      attributes: [ATTRIBUTES[i % ATTRIBUTES.length], ATTRIBUTES[(i + 2) % ATTRIBUTES.length], RARITY_LABEL[rarity]],
      editions: [
        { id: `${id}-1of1`, label: '1/1', supply: 1, available: i % 7 === 0 ? 0 : 1 },
        { id: `${id}-1of10`, label: '1/10', supply: 10, available: (i * 3) % 11 },
        { id: `${id}-1of50`, label: '1/50', supply: 50, available: 5 + ((i * 7) % 46) },
        { id: `${id}-open`, label: 'ABERTA', supply: null, available: 99 },
      ],
      rating: 4.8 - ((i * 3) % 14) / 10,
      reviewCount: 19 + ((i * 11) % 80),
      royaltyPercent: 5,
      contractAddress: i === 0 ? '0x7A42...19E8' : `0x${hex4(i * 977)}...${hex4(i * 4129)}`,
      tokenStandard: 'ERC-721',
      createdAt: new Date(Date.UTC(2026, 8, 15) - i * 86_400_000).toISOString(),
      trendingScore: (i * 37) % 100,
    }
  })
}