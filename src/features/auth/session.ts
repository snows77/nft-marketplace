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

// Troca de usuário: nada do cache anterior pode sobrar (dados privados).
// resetQueries (e não clear) descarta os dados mas mantém as queries ligadas aos
// componentes na tela, que recarregam já com a nova sessão.
export function switchSession(queryClient: QueryClient, session: Session | null): Promise<void> {
  setToken(session?.token ?? null)
  queryClient.setQueryData(sessionKey, session)
  return queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] })
}

function useStartSession() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    void switchSession(queryClient, session)
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
      void switchSession(queryClient, null)
      toast('Você saiu da sua conta.')
      navigate({ to: '/' })
    },
  })
}
