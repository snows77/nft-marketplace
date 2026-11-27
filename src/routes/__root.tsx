import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Toaster } from '@/components/ui/sonner'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { NotFound } from '@/components/layout/NotFound'
import { AuthDialog } from '@/features/auth/AuthDialog'

export interface RouterContext {
  queryClient: QueryClient
}

// Parâmetros válidos em qualquer página: abrem o modal de login/cadastro
// e dizem para onde voltar depois de entrar
const rootSearchSchema = z.object({
  auth: z.enum(['entrar', 'cadastro']).optional().catch(undefined),
  redirect: z.string().optional().catch(undefined),
})

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: rootSearchSchema,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      {/* Primeiro item do Tab: leva direto ao conteúdo, pulando a navegação */}
      <a
        href="#conteudo"
        className="sr-only z-50 rounded bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <AuthDialog />
      {/* No mobile os avisos sobem acima da barra inferior fixa (72px + botão central) */}
      <Toaster position="bottom-center" mobileOffset={{ bottom: 'calc(120px + env(safe-area-inset-bottom))' }} />
    </>
  )
}
