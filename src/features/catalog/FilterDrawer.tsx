import { SlidersHorizontal } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { NftListResponse } from '@/contracts/nft'
import type { NftSearch } from '@/contracts/nft-search'
import { CatalogFilters } from './CatalogFilters'

interface Props {
  search: NftSearch
  facets: NftListResponse['facets'] | undefined
  total: number | undefined
  activeCount: number
  onChange: (changes: Partial<NftSearch>) => void
}

// Mobile/tablet: os filtros ficam numa gaveta aberta pelo botão ao lado da busca (Figma).
// Cada escolha já atualiza a lista; o botão final só fecha a gaveta.
export function FilterDrawer({ search, facets, total, activeCount, onChange }: Props) {
  const count = total ?? 0
  return (
    <Sheet>
      <SheetTrigger
        aria-label={activeCount ? `Filtros (${activeCount} ativos)` : 'Filtros'}
        className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary-light lg:hidden"
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground text-2xs font-bold text-background"
          >
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto border-border bg-card p-6 text-foreground">
        <SheetHeader className="p-0">
          <SheetTitle className="text-title font-bold">Filtros</SheetTitle>
          <SheetDescription className="sr-only">Os resultados são atualizados a cada filtro escolhido.</SheetDescription>
        </SheetHeader>
        <CatalogFilters search={search} facets={facets} onChange={onChange} />
        <SheetClose className="sticky bottom-0 mt-6 h-11 w-full shrink-0 rounded bg-primary font-bold text-primary-foreground hover:bg-primary-light">
          Ver {count} {count === 1 ? 'resultado' : 'resultados'}
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
