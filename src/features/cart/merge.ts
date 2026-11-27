import type { QueryClient } from '@tanstack/react-query'
import { mergeGuestCart } from '@/api/cart'
import { cartKeys } from '@/api/queryKeys'
import { getGuestCartId, setGuestCartId } from '@/api/token'

// Ao entrar: os itens do visitante passam para o carrinho da conta (a API soma as
// quantidades respeitando a disponibilidade) e o carrinho anônimo deixa de existir
export async function mergeGuestCartIntoAccount(queryClient: QueryClient, userId: string): Promise<void> {
  const guestCartId = getGuestCartId()
  if (!guestCartId) return
  try {
    const cart = await mergeGuestCart(guestCartId)
    setGuestCartId(null)
    queryClient.setQueryData(cartKeys.detail(userId), cart)
    // O login também recarrega o carrinho; essa leitura pode ter saído antes da junção.
    // invalidate cancela a leitura em andamento e busca o estado final.
    void queryClient.invalidateQueries({ queryKey: cartKeys.detail(userId) })
  } catch {
    // se falhar, o carrinho do visitante continua guardado e a junção tenta no próximo login
  }
}
