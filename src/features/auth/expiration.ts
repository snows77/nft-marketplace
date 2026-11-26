import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { ApiRequestError } from '@/api/errors'
import { getToken } from '@/api/token'
import { switchSession } from './session'

let notifiedToken: string | null = null

// Avisa uma única vez por sessão expirada (várias requisições podem falhar juntas)
export function notifySessionExpired(): void {
  const token = getToken()
  if (token && token === notifiedToken) return
  notifiedToken = token
  toast.warning('Sua sessão expirou. Entre novamente.')
}

function isPrivateRoute(router: AnyRouter): boolean {
  return router.state.matches.some((match) => match.routeId.startsWith('/_privado'))
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
    if (!isSessionCheck) {
      void switchSession(queryClient, null)
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
