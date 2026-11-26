import { StrictMode, type ComponentType } from 'react'
import { isTransient } from './api/errors'
import { installSessionExpiryHandler } from './features/auth/expiration'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import '@fontsource-variable/roboto-mono'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Só repete falhas transitórias (rede, timeout, 5xx), no máximo 2 vezes
      retry: (failureCount, error) => isTransient(error) && failureCount < 2,
      retryDelay: 300,
    },
    mutations: { retry: false },
  },
})

const router = createRouter({
  routeTree,
  // Rotas acessam o cache (ex.: checar a sessão antes de abrir uma página privada)
  context: { queryClient },
  // Tudo na URL é string; quem converte é o schema Zod de cada rota
  parseSearch: (searchStr) => Object.fromEntries(new URLSearchParams(searchStr)),
  stringifySearch: (search) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    }
    const result = params.toString()
    return result ? `?${result}` : ''
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Sessão expirada em qualquer chamada: avisa, limpa os dados privados e abre o login
installSessionExpiryHandler(router, queryClient)

// Liga a API simulada (MSW) e devolve o painel de cenários, quando configurado
async function enableMocks(): Promise<ComponentType | null> {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return null
  const [{ worker }, { installMockControl }, { MockPanel }] = await Promise.all([
    import('./mocks/browser'),
    import('./mocks/control'),
    import('./mocks/MockPanel'),
  ])
  // Imagens, fontes etc. não têm handler: seguem direto para a rede
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
  installMockControl()
  return MockPanel
}

enableMocks().then((MockPanel) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {MockPanel && <MockPanel />}
      </QueryClientProvider>
    </StrictMode>,
  )
})