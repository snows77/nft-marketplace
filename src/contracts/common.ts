import { z } from 'zod'

// ETH trafega sempre como string decimal (nunca number)
export const ethString = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')

export const apiErrorSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'UNAUTHENTICATED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'OUT_OF_STOCK',
    'PRICE_CHANGED',
    'IDEMPOTENCY_CONFLICT',
    'ORDER_PENDING',
    'TRANSIENT_ERROR',
  ]),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>