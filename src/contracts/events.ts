import { z } from 'zod'
import { ethString } from './common'
import { orderStatusSchema } from './order'

// Eventos em tempo real (Socket.IO). Todo evento carrega:
// - eventId: identidade estável (o mesmo evento reenviado mantém o id) → deduplicação;
// - id do recurso afetado (nftId / orderId);
// - version: versão do recurso depois da mudança → eventos antigos são ignorados.

// nft.updated: preço e disponibilidade das edições mudaram (enviado a todos os sockets)
export const nftUpdatedEventSchema = z.object({
  eventId: z.string().min(1),
  nftId: z.string().min(1),
  version: z.number().int(),
  priceEth: ethString,
  // Estado completo das edições depois da mudança (não é um delta)
  editions: z.array(z.object({ id: z.string(), available: z.number().int().min(0) })),
  occurredAt: z.string(), // ISO
})

// order.updated: o estado de um pedido mudou (enviado só aos sockets do dono do pedido)
export const orderUpdatedEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  userId: z.string().min(1),
  version: z.number().int(),
  status: orderStatusSchema,
  occurredAt: z.string(), // ISO
})

// Mapa evento → schema: o cliente valida todo evento recebido com ele
export const realtimeEventSchemas = {
  'nft.updated': nftUpdatedEventSchema,
  'order.updated': orderUpdatedEventSchema,
} as const

export type RealtimeEventName = keyof typeof realtimeEventSchemas
export type RealtimeEventPayload<E extends RealtimeEventName> = z.infer<(typeof realtimeEventSchemas)[E]>
export type NftUpdatedEvent = RealtimeEventPayload<'nft.updated'>
export type OrderUpdatedEvent = RealtimeEventPayload<'order.updated'>
