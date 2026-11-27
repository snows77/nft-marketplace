import { z } from 'zod'
import { ethString } from './common'
import { walletNetworkSchema, walletProviderSchema, walletSlotSchema } from './wallet'

// Dados do colecionador informados no checkout (validados no cliente e na API)
export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição.'),
  username: z.string().trim().min(3, 'Informe seu nome de usuário.'),
  email: z.email('Informe um e-mail válido.'),
  referralCode: z.string().trim().max(20, 'Use no máximo 20 caracteres.').optional(),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres.').optional(),
})

export const paymentSchema = z.object({
  walletSlot: walletSlotSchema,
  network: walletNetworkSchema,
  provider: walletProviderSchema,
})

// Linha congelada do pedido: preço e edição no momento da compra (snapshot do recibo)
export const orderItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenNumber: z.number().int(),
  image: z.string(),
  quantity: z.number().int().min(1),
  unitPriceEth: ethString,
  lineTotalEth: ethString,
})

// Cotação: a referência para fechar o pedido. Expira e é invalidada se o carrinho,
// os preços, a disponibilidade ou o cupom mudarem.
export const quoteSchema = z.object({
  id: z.string(),
  items: z.array(orderItemSchema),
  couponCode: z.string().nullable(),
  subtotalEth: ethString,
  discountEth: ethString,
  networkFeeEth: ethString,
  totalEth: ethString,
  expiresAt: z.string(),
})

export const orderStatusSchema = z.enum(['pendente', 'confirmado', 'recusado'])

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(orderItemSchema),
  subtotalEth: ethString,
  discountEth: ethString,
  networkFeeEth: ethString,
  totalEth: ethString,
  couponCode: z.string().nullable(),
  payment: paymentSchema.extend({ walletLabel: z.string(), address: z.string() }),
  buyer: buyerSchema,
  transactionHash: z.string().nullable(), // simulado; só existe quando confirmado
  explorerUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
})

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  buyer: buyerSchema,
  payment: paymentSchema,
})

// Resposta 409 de cotação desatualizada: a nova cotação vem junto para revisão
export const staleQuoteSchema = z.object({ code: z.string(), message: z.string(), quote: quoteSchema })

export type Buyer = z.infer<typeof buyerSchema>
export type Payment = z.infer<typeof paymentSchema>
export type Quote = z.infer<typeof quoteSchema>
export type Order = z.infer<typeof orderSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>
