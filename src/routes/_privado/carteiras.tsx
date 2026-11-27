import { createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/AccountLayout'
import { WalletSection } from '@/features/account/WalletSection'
import { useWalletsQuery } from '@/features/account/hooks'

// Carteiras do colecionador: cadastro e edição da principal e da secundária
export const Route = createFileRoute('/_privado/carteiras')({
  component: WalletsPage,
})

function WalletsPage() {
  const wallets = useWalletsQuery()

  return (
    <AccountLayout>
      {wallets.isPending && (
        <div role="status" aria-label="Carregando carteiras" className="space-y-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-6 w-48 rounded" />
              <div className="skeleton h-24 rounded" />
            </div>
          ))}
        </div>
      )}
      {wallets.isError && (
        <div role="alert" className="space-y-2 text-caption">
          <p>Não foi possível carregar suas carteiras.</p>
          <button type="button" className="font-bold text-primary underline" onClick={() => wallets.refetch()}>
            Tentar de novo
          </button>
        </div>
      )}
      {wallets.data && (
        <div className="space-y-10">
          <WalletSection
            slot="principal"
            wallet={wallets.data.principal}
            description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
          />
          <WalletSection slot="secundaria" wallet={wallets.data.secundaria} />
        </div>
      )}
    </AccountLayout>
  )
}
