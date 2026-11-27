import type { ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { fetchNfts } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import type { NftSearch } from '@/contracts/nft-search'
import { CatalogFilters } from './CatalogFilters'
import { CatalogToolbar } from './CatalogToolbar'
import { FilterDrawer } from './FilterDrawer'
import { CATEGORY_LABEL, formatEthBr, NETWORK_LABEL } from './labels'
import { NftGrid, NftGridSkeleton } from './NftGrid'
import { Pagination } from './Pagination'
import { SearchBox } from './SearchBox'

interface Props {
  search: NftSearch
  // Muda filtros/busca/aba/ordem (volta para a página 1) ou só a página
  onFilter: (changes: Partial<NftSearch>) => void
  onPage: (page: number) => void
  sidebarExtra?: ReactNode // ex.: card "NFT em destaque" abaixo dos filtros
}

const actionButton =
  'rounded bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary-light'

export function Catalog({ search, onFilter, onPage, sidebarExtra }: Props) {
  // A chave inclui todos os parâmetros: cada combinação tem seu cache, e uma resposta
  // atrasada de uma busca antiga nunca aparece na busca atual (o signal ainda a cancela)
  const query = useQuery({
    queryKey: nftKeys.list(search),
    queryFn: ({ signal }) => fetchNfts(search, signal),
    placeholderData: keepPreviousData,
  })
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = query

  const chips = activeFilters(search)
  const clearAll = () =>
    onFilter({ q: undefined, category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined })

  const filters = <CatalogFilters search={search} facets={data?.facets} onChange={onFilter} />

  return (
    <section id="catalogo" aria-label="Catálogo" className="scroll-mt-6 py-6">
      <div className="grid gap-8 lg:grid-cols-[310px_1fr]">
        <div className="hidden space-y-6 lg:block">
          <aside aria-label="Filtros" className="bg-card p-5">
            {filters}
          </aside>
          {sidebarExtra}
        </div>

        <div className="min-w-0 space-y-6">
          <div className="flex gap-3">
            <SearchBox key={search.q ?? ''} value={search.q} onSearch={(q) => onFilter({ q })} />
            <FilterDrawer
              search={search}
              facets={data?.facets}
              total={data?.total}
              activeCount={chips.length}
              onChange={onFilter}
            />
          </div>

          <CatalogToolbar search={search} onChange={onFilter} />

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <ul aria-label="Filtros ativos" className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border-soft py-1 pr-1 pl-3 text-caption">
                      {chip.label}
                      <button
                        type="button"
                        aria-label={`Remover filtro ${chip.label}`}
                        onClick={() => onFilter(chip.clear)}
                        className="rounded-full p-1 hover:text-primary"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={clearAll} className="text-caption text-primary hover:underline">
                Limpar tudo
              </button>
            </div>
          )}

          {data && (
            <p role="status" className="text-caption text-muted-foreground">
              {data.total} {data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}
              {isFetching && isPlaceholderData && <span> · atualizando…</span>}
            </p>
          )}

          {isPending && <NftGridSkeleton />}

          {isError && !data && (
            <div role="alert" className="space-y-3 rounded-lg bg-card p-6">
              <p>Não foi possível carregar os NFTs.</p>
              <button type="button" className={actionButton} onClick={() => refetch()}>
                Tentar de novo
              </button>
            </div>
          )}

          {data && data.total === 0 && (
            <div className="space-y-3 rounded-lg bg-card p-6">
              <p>Nenhum NFT encontrado para estes filtros.</p>
              <button type="button" className={actionButton} onClick={clearAll}>
                Limpar filtros
              </button>
            </div>
          )}

          {data && data.total > 0 && data.items.length === 0 && (
            <div className="space-y-3 rounded-lg bg-card p-6">
              <p>Esta página não existe.</p>
              <button type="button" className={actionButton} onClick={() => onPage(1)}>
                Voltar à primeira página
              </button>
            </div>
          )}

          {data && data.items.length > 0 && (
            <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
              <NftGrid items={data.items} />
            </div>
          )}

          {data && data.items.length > 0 && (
            <Pagination page={search.page} totalPages={data.totalPages} onChange={onPage} />
          )}
        </div>
      </div>
    </section>
  )
}

interface Chip {
  key: string
  label: string
  clear: Partial<NftSearch>
}

function activeFilters(search: NftSearch): Chip[] {
  const chips: Chip[] = []
  if (search.q) chips.push({ key: 'q', label: `“${search.q}”`, clear: { q: undefined } })
  if (search.category) {
    chips.push({ key: 'category', label: CATEGORY_LABEL[search.category], clear: { category: undefined } })
  }
  if (search.network) {
    chips.push({ key: 'network', label: NETWORK_LABEL[search.network], clear: { network: undefined } })
  }
  if (search.minPrice || search.maxPrice) {
    const min = search.minPrice ? formatEthBr(search.minPrice) : '0'
    const max = search.maxPrice ? formatEthBr(search.maxPrice) : '∞'
    chips.push({ key: 'price', label: `${min} – ${max} ETH`, clear: { minPrice: undefined, maxPrice: undefined } })
  }
  return chips
}
