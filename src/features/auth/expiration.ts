import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { ApiRequestError } from '@/api/errors'
import type { Session } from '@/contracts/auth'
import { isPrivateRoute } from './guards'
import { sessionKey, switchSession } from './session'

// O id fixo faz o sonner reaproveitar o mesmo aviso: várias requisições falhando
// juntas mostram uma mensagem só
export function notifySessionExpired(): void {
  toast.warning('Sua sessão expirou. Entre novamente.', { id: 'sessao-expirada' })
}

// Qualquer chamada recusada com SESSION_EXPIRED encerra a sessão local, avisa e abre o
// login preservando o destino. A checagem da própria sessão (/auth/session) só avisa:
// quem decide o redirecionamento nesse caso é a proteção da rota (_privado.beforeLoad).
export function installSessionExpiryHandler(router: AnyRouter, queryClient: QueryClient): void {
  api.interceptors.response.use(undefined, (error) => {
    if (!(error instanceof ApiRequestError) || error.code !== 'SESSION_EXPIRED') {
      return Promise.reject(error)
    }
    notifySessionExpired()

    const isSessionCheck = error.requestUrl?.startsWith('/auth/') ?? false
    const alreadyEnded = queryClient.getQueryData<Session | null>(sessionKey) == null
    if (!isSessionCheck && !alreadyEnded) {
      switchSession(queryClient, null)
      const { href } = router.state.location
      if (isPrivateRoute(router)) {
        void router.navigate({ to: '/', search: { auth: 'entrar', redirect: href } })
      } else {
        void router.navigate({ to: '.', search: (prev) => ({ ...prev, auth: 'entrar' as const }) })
      }
    }
    return Promise.reject(error)
  })
}
