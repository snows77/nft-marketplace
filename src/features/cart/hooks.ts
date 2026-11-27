import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addCartItem,
  applyCoupon,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/api/cart'
import { ApiRequestError } from '@/api/errors'
import { cartKeys } from '@/api/queryKeys'
import type { Cart } from '@/contracts/cart'
import { useSession } from '@/features/auth/session'

// Dono do carrinho no cache: o usuário logado ou o visitante deste navegador
function useCartOwner() {
  const { user, isPending } = useSession()
  return { owner: user?.id ?? 'visitante', ready: !isPending }
}

export function useCart() {
  const { owner, ready } = useCartOwner()
  return useQuery({
    queryKey: cartKeys.detail(owner),
    queryFn: ({ signal }) => fetchCart(signal),
    enabled: ready,
  })
}

// Toda mutation devolve o carrinho inteiro (itens + cotação): vai direto para o cache
function useCartMutation<TInput>(mutationFn: (input: TInput) => Promise<Cart>, onError?: (err: unknown) => void) {
  const queryClient = useQueryClient()
  const { owner } = useCartOwner()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.detail(owner), cart),
    onError: (err) => {
      if (onError) return onError(err)
      // Estoque mudou: avisa e recarrega o carrinho com a disponibilidade atual
      if (err instanceof ApiRequestError && err.code === 'OUT_OF_STOCK') {
        toast.error(err.message)
        void queryClient.invalidateQueries({ queryKey: cartKeys.detail(owner) })
        return
      }
      if (err instanceof ApiRequestError && err.code === 'SESSION_EXPIRED') return // o interceptor já avisa
      toast.error('Não foi possível atualizar o carrinho. Tente novamente.')
    },
  })
}

export function useAddToCart() {
  return useCartMutation(addCartItem)
}

export function useUpdateCartItem() {
  return useCartMutation(updateCartItem)
}

export function useRemoveCartItem() {
  return useCartMutation(removeCartItem)
}

// O erro do cupom (inválido/expirado) é mostrado no próprio campo pelo formulário
export function useApplyCoupon() {
  return useCartMutation(applyCoupon, () => {})
}

export function useRemoveCoupon() {
  return useCartMutation(removeCoupon)
}
