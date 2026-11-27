import { z } from 'zod'
import { ethString } from './common'

// Uma linha do carrinho: NFT + edição + quantidade, já com o preço atual da API
export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(), // "1/50", "ABERTA"
  name: z.string(),
  tokenNumber: z.number().int(),
  image: z.string(),
  quantity: z.number().int().min(1),
  available: z.number().int().min(0), // quantos ainda existem desta edição
  unitPriceEth: ethString,
  lineTotalEth: ethString,
  // Preço quando o item foi adicionado, se mudou desde então (para avisar a pessoa)
  previousUnitPriceEth: ethString.nullable(),
  // A quantidade pedida não está mais disponível (edição esgotou ou diminuiu)
  unavailable: z.boolean(),
})

export const couponSchema = z.object({
  code: z.string(),
  label: z.string(), // "Desconto do lançamento"
  discountPercent: z.number(),
})

// O carrinho já vem com a cotação calculada pela API: o cliente nunca soma preços
export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  subtotalEth: ethString,
  discountEth: ethString,
  networkFeeEth: ethString,
  totalEth: ethString,
  itemCount: z.number().int(),
  version: z.number().int(),
  updatedAt: z.string(),
})

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1, 'A quantidade mínima é 1.'),
})

export const updateCartItemInputSchema = z.object({
  quantity: z.number().int().min(1, 'A quantidade mínima é 1.'),
})

export const couponInputSchema = z.object({
  code: z.string().trim().min(1, 'Digite o código promocional.'),
})

export type Cart = z.infer<typeof cartSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>
