import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchNfts } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import { nftSearchSchema, type NftSearch } from '@/contracts/nft-search'
import { Button } from '@/components/ui/button'
import { NftGrid, NftGridSkeleton } from '@/features/catalog/NftGrid'
import { Pagination } from '@/features/catalog/Pagination'

export const Route = createFileRoute('/')({
  validateSearch: (search) => nftSearchSchema.parse(search),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [text, setText] = useState(search.q ?? '')

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: nftKeys.list(search),
    queryFn: ({ signal }) => fetchNfts(search, signal),
    placeholderData: keepPreviousData, // mantém a lista anterior durante a troca
  })

  // Qualquer mudança de filtro volta para a página 1
  function updateFilters(changes: Partial<NftSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...changes, page: 1 }) })
  }

  function goToPage(page: number) {
    navigate({ search: (prev) => ({ ...prev, page }) })
  }

  return (
    <main className="space-y-4 p-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          updateFilters({ q: text.trim() || undefined })
        }}
      >
        <input
          aria-label="Buscar"
          className="rounded border bg-card px-2 py-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit">Buscar</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(['all', 'new', 'trending'] as const).map((tab) => (
          <Button
            key={tab}
            variant={search.tab === tab ? 'default' : 'outline'}
            onClick={() => updateFilters({ tab })}
          >
            {tab}
          </Button>
        ))}
        <select
          aria-label="Categoria"
          className="rounded border bg-card px-2"
          value={search.category ?? ''}
          onChange={(e) =>
            updateFilters({ category: (e.target.value || undefined) as NftSearch['category'] })
          }
        >
          <option value="">todas</option>
          <option value="musica">música</option>
          <option value="jogos">jogos</option>
          <option value="arte-3d">arte 3d</option>
        </select>
        <select
          aria-label="Ordenar"
          className="rounded border bg-card px-2"
          value={search.sort}
          onChange={(e) => updateFilters({ sort: e.target.value as NftSearch['sort'] })}
        >
          <option value="recent">recentes</option>
          <option value="price-asc">preço ↑</option>
          <option value="price-desc">preço ↓</option>
        </select>
      </div>

      {isPending && <NftGridSkeleton />}

      {isError && (
        <div role="alert" className="space-y-2">
          <p>Não foi possível carregar os NFTs.</p>
          <Button onClick={() => refetch()}>Tentar de novo</Button>
        </div>
      )}

      {data && (
        <>
          <p className="text-muted-foreground" aria-live="polite">
            {data.total} NFTs, página {data.page} de {data.totalPages}
            {isFetching && ' (atualizando...)'}
          </p>

          {data.items.length === 0 ? (
            <p>Nenhum NFT encontrado.</p>
          ) : (
            <NftGrid items={data.items} />
          )}

          <Pagination page={search.page} totalPages={data.totalPages} onChange={goToPage} />
        </>
      )}
    </main>
  )
}