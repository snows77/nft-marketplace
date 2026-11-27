import { useEffect, useRef } from 'react'
import type { RealtimeEventName, RealtimeEventPayload } from '@/contracts/events'
import { subscribeEvent } from './client'

// Assina um evento do socket enquanto o componente estiver montado (o listener é
// liberado ao desmontar). O handler recebe o evento já validado, sem duplicatas, mais
// novo que o já aplicado e — em eventos de usuário — só se for do usuário atual.
//
// @example
// useSocketEvent('order.updated', (event) => {
//   if (event.orderId === orderId && event.status === 'recusado') toast.error('Pagamento recusado')
// })
export function useSocketEvent<E extends RealtimeEventName>(
  event: E,
  handler: (payload: RealtimeEventPayload<E>) => void,
): void {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => subscribeEvent(event, (payload) => latest.current(payload)), [event])
}
