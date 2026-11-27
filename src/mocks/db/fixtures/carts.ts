export interface DbCartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  priceAtAddEth: string // preço no momento em que entrou no carrinho
}

export interface DbCart {
  id: string
  userId: string | null // null = carrinho de visitante
  items: DbCartItem[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface DbCoupon {
  code: string
  label: string
  discountPercent: number
  expired: boolean
}

export const COUPONS: DbCoupon[] = [
  { code: 'LANCAMENTO', label: 'Desconto do lançamento', discountPercent: 5, expired: false },
  { code: 'KURIO10', label: 'Cupom KURIO10', discountPercent: 10, expired: false },
  { code: 'GENESIS2025', label: 'Cupom Gênesis', discountPercent: 15, expired: true },
]

// A ana começa com o carrinho do Figma mobile (para a demo); o bruno começa vazio
export function buildCarts(): DbCart[] {
  const now = new Date(Date.UTC(2026, 10, 1)).toISOString()
  return [
    {
      id: 'cart-ana',
      userId: 'user-ana',
      couponCode: null,
      version: 1,
      updatedAt: now,
      items: [
        { id: 'item-ana-1', nftId: 'nft-005', editionId: 'nft-005-1of1', quantity: 1, priceAtAddEth: '1.39' },
        { id: 'item-ana-2', nftId: 'nft-006', editionId: 'nft-006-1of10', quantity: 2, priceAtAddEth: '1.79' },
        { id: 'item-ana-3', nftId: 'nft-007', editionId: 'nft-007-1of50', quantity: 2, priceAtAddEth: '0.99' },
      ],
    },
  ]
}
