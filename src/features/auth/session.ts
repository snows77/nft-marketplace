import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { fetchSession, login, logout, register } from '@/api/auth'
import { ApiRequestError } from '@/api/errors'
import { getToken, setToken } from '@/api/token'
import type { Session } from '@/contracts/auth'
import { mergeGuestCartIntoAccount } from '@/features/cart/merge'

export const sessionKey = ['session'] as const

// Quem está logado. null = visitante. Sem token nem chama a API.
export const sessionQueryOptions = queryOptions({
  queryKey: sessionKey,
  queryFn: async ({ signal }): Promise<Session | null> => {
    if (!getToken()) return null
    try {
      return await fetchSession(signal)
    } catch (err) {
      // Token recusado (desconhecido ou expirado): segue como visitante
      if (err instanceof ApiRequestError && err.status === 401) {
        setToken(null)
        return null
      }
      throw err
    }
  },
  staleTime: Infinity,
  retry: false,
})

export function useSession() {
  const { data, isPending } = useQuery(sessionQueryOptions)
  return { user: data?.user ?? null, isPending }
}

// Troca a sessão atual. O descarte dos dados privados do usuário anterior é feito
// pelo guarda de sessão (guards.ts), que observa qualquer mudança de identidade.
export function switchSession(queryClient: QueryClient, session: Session | null): void {
  setToken(session?.token ?? null)
  queryClient.setQueryData(sessionKey, session)
}

function useStartSession() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    switchSession(queryClient, session)
    void mergeGuestCartIntoAccount(queryClient, session.user.id)
    toast.success(`Olá, ${session.user.username}!`)
  }
}

export function useLogin() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: login, onSuccess: startSession })
}

export function useRegister() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: register, onSuccess: startSession })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    // Mesmo se a API falhar, a sessão local é encerrada
    onSettled: () => {
      switchSession(queryClient, null)
      toast('Você saiu da sua conta.')
      navigate({ to: '/' })
    },
  })
}
