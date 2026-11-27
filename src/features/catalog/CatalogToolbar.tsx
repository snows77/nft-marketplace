import { Link } from '@tanstack/react-router'
import type { NftSearch } from '@/contracts/nft-search'
import { cn } from '@/lib/utils'
import { SORT_LABEL, TAB_LABEL } from './labels'

interface Props {
  search: NftSearch
  onChange: (changes: Partial<NftSearch>) => void
}

const TABS = Object.keys(TAB_LABEL) as NftSearch['tab'][]

// Abas "Todos os NFTs / Novos lançamentos / Em alta" + "Ordenar por" (Figma).
// As abas Novos/Em alta têm ordem própria, então a ordenação só aparece em "Todos".
export function CatalogToolbar({ search, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <nav aria-label="Seções do catálogo" className="-mx-1 overflow-x-auto">
        <ul className="flex gap-4 px-1 whitespace-nowrap">
          {TABS.map((tab) => {
            const active = search.tab === tab
            return (
              <li key={tab}>
                <Link
                  to="/"
                  search={(prev) => ({ ...prev, tab, page: undefined })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-block border-b-2 pb-0.5 text-body font-bold',
                    active ? 'border-primary text-primary' : 'border-transparent hover:text-primary',
                  )}
                  activeOptions={{ includeSearch: false }}
                >
                  {TAB_LABEL[tab]}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {search.tab === 'all' && (
        <label className="flex items-center gap-2 text-body">
          <span>Ordenar por:</span>
          <select
            value={search.sort}
            onChange={(e) => onChange({ sort: e.target.value as NftSearch['sort'] })}
            className="rounded border border-border-soft bg-background px-2 py-1.5 text-body"
          >
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
