import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedNfts } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import { nftSearchSchema, type NftSearch } from '@/contracts/nft-search'
import { Container } from '@/components/layout/Container'
import { Catalog } from '@/features/catalog/Catalog'
import { BenefitsStrip } from '@/features/home/BenefitsStrip'
import { FeaturedNft } from '@/features/home/FeaturedNft'
import { HeroCarousel } from '@/features/home/HeroCarousel'
import { MintJournal } from '@/features/home/MintJournal'
import { PromoBanners } from '@/features/home/PromoBanners'
import { useMediaQuery } from '@/lib/use-media-query'

export const Route = createFileRoute('/')({
  // Passar o schema direto (Standard Schema) faz o TanStack usar o tipo de *entrada*
  // nos <Link>, onde tab/sort/page são opcionais, e o de *saída* no useSearch.
  validateSearch: nftSearchSchema,
  // Valores padrão não aparecem na URL: "/" em vez de "/?tab=all&sort=recent&page=1"
  search: {
    middlewares: [stripSearchParams({ tab: 'all', sort: 'recent', page: 1 })],
  },
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const featured = useQuery({
    queryKey: nftKeys.featured,
    queryFn: ({ signal }) => fetchFeaturedNfts(signal),
    staleTime: 5 * 60_000, // destaques mudam pouco
  })

  // Qualquer mudança de filtro, busca, aba ou ordem volta para a página 1
  function onFilter(changes: Partial<NftSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...changes, page: 1 }) })
  }

  function onPage(page: number) {
    navigate({ search: (prev) => ({ ...prev, page }) })
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Container>
      <HeroCarousel items={featured.data} />
      <Catalog
        search={search}
        onFilter={onFilter}
        onPage={onPage}
        // Só no desktop: no mobile a barra lateral não existe e a imagem seria baixada à toa
        sidebarExtra={isDesktop ? <FeaturedNft nft={featured.data?.[1] ?? featured.data?.[0]} /> : null}
      />
      <PromoBanners />
      <MintJournal />
      <BenefitsStrip />
    </Container>
  )
}
