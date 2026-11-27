import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { TOKEN_KEY } from '@/api/token'
import type { Session } from '@/contracts/auth'
import { sessionKey, sessionQueryOptions } from './session'

export function isPrivateRoute(router: AnyRouter): boolean {
  return router.state.matches.some((match) => match.routeId.startsWith('/_privado'))
}

// Isolamento entre usuários, num lugar só:
// 1. sempre que a identidade da sessão muda (logout, expiração, troca de usuário),
//    todos os dados em cache, exceto a própria sessão, são descartados;
// 2. login/logout feito em outra aba (mesmo localStorage) é refletido nesta.
export function installSessionGuards(router: AnyRouter, queryClient: QueryClient): void {
  let currentUserId: string | null | undefined = queryClient.getQueryData<Session | null>(sessionKey)?.user.id

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== sessionKey[0]) return
    const data = event.query.state.data as Session | null | undefined
    if (data === undefined) return // ainda carregando: identidade desconhecida

    const nextUserId = data?.user.id ?? null
    if (nextUserId === currentUserId) return
    const hadUser = currentUserId != null
    currentUserId = nextUserId
    // Visitante → usuário não tem dado privado a descartar; os demais casos têm
    if (hadUser) {
      queueMicrotask(() => {
        void queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] })
      })
    }
  })

  window.addEventListener('storage', (event) => {
    if (event.key !== TOKEN_KEY && event.key !== null) return
    void queryClient
      .fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
      .then((session) => {
        if (!session && isPrivateRoute(router)) {
          const { href } = router.state.location
          void router.navigate({ to: '/', search: { auth: 'entrar', redirect: href } })
        }
      })
      .catch(() => {
        // sem rede: a próxima navegação privada revalida a sessão
      })
  })
}
