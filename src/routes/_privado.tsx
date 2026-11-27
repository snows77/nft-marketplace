import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/session'
import type { Session } from '@/contracts/auth'

// Layout das rotas que exigem login (perfil, carteiras, checkout, pedidos...).
// A cada navegação para uma delas a sessão é revalidada com a API, para detectar
// expiração mesmo sem recarregar a página.
export const Route = createFileRoute('/_privado')({
  beforeLoad: async ({ context, location }) => {
    let session: Session | null
    try {
      session = await context.queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
    } catch {
      // Falha de rede: confia na sessão que já estava em cache (se houver)
      session = context.queryClient.getQueryData(sessionQueryOptions.queryKey) ?? null
    }
    if (!session) {
      throw redirect({ to: '/', search: { auth: 'entrar', redirect: location.href } })
    }
    return { session }
  },
  component: Outlet,
})
