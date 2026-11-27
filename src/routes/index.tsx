import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { nftSearchSchema, type NftSearch } from '@/contracts/nft-search'
import { Container } from '@/components/layout/Container'
import { Catalog } from '@/features/catalog/Catalog'

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
      <Catalog search={search} onFilter={onFilter} onPage={onPage} />
    </Container>
  )
}
