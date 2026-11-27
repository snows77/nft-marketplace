import Decimal from 'decimal.js'

// ETH continua string: só formatamos para exibir, sem converter para number
export const formatEth = (value: string) => `${value} ETH`

export const formatTokenNumber = (n: number) => `#${String(n).padStart(3, '0')}`

// Preço × quantidade com decimal.js (3 × "1.19" = "3.57", sem erro de ponto flutuante).
// Mantém as casas decimais do preço: "0.10" × 3 = "0.30".
export function multiplyEth(priceEth: string, quantity: number): string {
  const decimals = priceEth.split('.')[1]?.length ?? 0
  return new Decimal(priceEth).times(quantity).toFixed(decimals)
}
