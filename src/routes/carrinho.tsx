import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { fetchNfts } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import { Container } from '@/components/layout/Container'
import { NftCard } from '@/features/catalog/NftCard'
import { CartItemRow } from '@/features/cart/CartItemRow'
import { CartSummary } from '@/features/cart/CartSummary'
import { useCart } from '@/features/cart/hooks'

// Carrinho (Figma desktop e mobile). Público: visitante também tem carrinho.
export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const cart = useCart()
  const router = useRouter()

  return (
    <Container className="py-6 md:py-8">
      {/* Mobile: voltar + título; desktop: trilha de navegação */}
      <div className="mb-6 flex items-center gap-4 md:hidden">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.history.back()}
          className="flex size-9 items-center justify-center rounded-full bg-card"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-title font-bold">Carrinho de NFTs</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="mb-4 hidden text-body font-bold md:block">
        <Link to="/" className="hover:text-primary">
          Início
        </Link>{' '}
        / <Link to="/" hash="catalogo" className="hover:text-primary">Mercado</Link> / <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="sr-only md:not-sr-only md:mb-2 md:text-title md:font-bold">Carrinho</h1>

      {cart.isPending && (
        <div role="status" aria-label="Carregando carrinho" className="grid gap-8 md:grid-cols-[1fr_330px]">
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-[96px] rounded-xl md:h-[70px] md:rounded-none" />
            ))}
          </div>
          <div className="skeleton h-80 rounded" />
        </div>
      )}

      {cart.isError && (
        <div role="alert" className="space-y-3 rounded-lg bg-card p-6">
          <p>Não foi possível carregar seu carrinho.</p>
          <button type="button" onClick={() => cart.refetch()} className="rounded bg-primary px-4 py-2 font-bold text-primary-foreground">
            Tentar de novo
          </button>
        </div>
      )}

      {cart.data && cart.data.items.length === 0 && (
        <div className="space-y-4 rounded-lg bg-card p-8 text-center">
          <p className="text-title">Seu carrinho está vazio.</p>
          <Link
            to="/"
            className="inline-block rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground hover:bg-primary-light"
          >
            Explorar NFTs
          </Link>
        </div>
      )}

      {cart.data && cart.data.items.length > 0 && (
        <div className="grid gap-8 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_330px] lg:gap-20">
          <section aria-label="Itens do carrinho">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[70px_1fr_120px_130px_110px_48px] gap-x-4 border-b border-border pb-3 text-body font-bold md:grid"
            >
              <span className="col-span-2">NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            <ul className="mt-3 space-y-3">
              {cart.data.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
          <CartSummary cart={cart.data} />
        </div>
      )}

      <AlsoViewed />
    </Container>
  )
}

// "Colecionadores também viram" (Figma desktop): NFTs em alta do catálogo
function AlsoViewed() {
  const search = { tab: 'trending' as const, sort: 'recent' as const, page: 1 }
  const { data } = useQuery({
    queryKey: nftKeys.list(search),
    queryFn: ({ signal }) => fetchNfts(search, signal),
    staleTime: 60_000,
  })
  if (!data) return null

  return (
    <section aria-labelledby="tambem-viram" className="mt-16 hidden md:block">
      <h2 id="tambem-viram" className="border-b border-border pb-3 text-title font-bold text-primary">
        Colecionadores também viram
      </h2>
      <ul className="mt-6 grid grid-cols-3 gap-6 lg:grid-cols-5">
        {data.items.slice(0, 5).map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
    </section>
  )
}
