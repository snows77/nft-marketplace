import { notifyUnavailable } from '@/lib/unavailable'

export interface AddToCartInput {
  nftId: string
  editionId: string
  quantity: number
}

// "Comprar NFT" e "Adicionar ao carrinho" chamam esta função com a edição e a
// quantidade escolhidas. Enquanto o carrinho não existe, apenas avisa (sem fingir sucesso).
export function addToCartPlaceholder(input: AddToCartInput): void {
  void input
  // PEDAÇO 5: substituir pela mutation do carrinho
  notifyUnavailable()
}
