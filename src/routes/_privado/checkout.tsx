import { createFileRoute, Link } from '@tanstack/react-router'
import { Container } from '@/components/layout/Container'
import { useSession } from '@/features/auth/session'
import { useProfileQuery, useWalletsQuery } from '@/features/account/hooks'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'

// Pagamento (privado: exige login; o guarda de _privado leva ao login e volta para cá)
export const Route = createFileRoute('/_privado/checkout')({
  component: CheckoutRoute,
})

function CheckoutRoute() {
  const { user } = useSession()
  const profile = useProfileQuery()
  const wallets = useWalletsQuery()

  return (
    <Container className="py-8">
      <nav aria-label="Trilha de navegação" className="mb-6 text-body font-bold">
        <Link to="/" className="hover:text-primary">
          Início
        </Link>{' '}
        / <Link to="/carrinho" className="hover:text-primary">Carrinho</Link> / <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="sr-only">Pagamento com carteira</h1>
      {(profile.isPending || wallets.isPending) && (
        <div role="status" aria-label="Carregando pagamento" className="grid gap-10 lg:grid-cols-[1fr_405px]">
          <div className="skeleton h-96 rounded" />
          <div className="skeleton h-96 rounded" />
        </div>
      )}
      {(profile.isError || wallets.isError) && (
        <div role="alert" className="space-y-3 rounded bg-card p-6">
          <p>Não foi possível carregar seus dados de pagamento.</p>
          <button
            type="button"
            className="rounded bg-primary px-4 py-2 font-bold text-primary-foreground"
            onClick={() => {
              void profile.refetch()
              void wallets.refetch()
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {user && profile.data && wallets.data && (
        <CheckoutPage
          userId={user.id}
          profile={profile.data}
          wallets={[wallets.data.principal, wallets.data.secundaria].filter((w) => w !== null)}
        />
      )}
    </Container>
  )
}
