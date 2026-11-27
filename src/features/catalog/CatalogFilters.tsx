import { useId, useState } from 'react'
import Decimal from 'decimal.js'
import type { NftListResponse } from '@/contracts/nft'
import type { NftSearch } from '@/contracts/nft-search'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { CATEGORIES, CATEGORY_LABEL, formatEthBr, NETWORKS, NETWORK_LABEL } from './labels'

type Facets = NftListResponse['facets']

interface Props {
  search: NftSearch
  facets: Facets | undefined
  onChange: (changes: Partial<NftSearch>) => void
}

const groupTitle = 'mb-3 text-title font-bold'
const optionClass =
  'flex w-full items-center justify-between rounded px-3 py-2 text-left text-body transition-colors hover:text-primary aria-pressed:font-bold aria-pressed:text-primary'

// Conteúdo dos filtros (Figma): Coleções, Faixa de preço e Rede.
// Usado na barra lateral (desktop) e na gaveta (mobile).
export function CatalogFilters({ search, facets, onChange }: Props) {
  // ids únicos: barra lateral e gaveta podem estar na página ao mesmo tempo
  const id = useId()
  return (
    <div className="space-y-8">
      <section aria-labelledby={`${id}-colecoes`}>
        <h2 id={`${id}-colecoes`} className={groupTitle}>
          Coleções
        </h2>
        <ul className="space-y-1">
          {CATEGORIES.map((category) => {
            const active = search.category === category
            return (
              <li key={category}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ category: active ? undefined : category })}
                  className={cn(optionClass, active ? 'bg-surface-dark' : 'text-primary-light')}
                >
                  <span>{CATEGORY_LABEL[category]}</span>
                  <span className="tabular-nums">({facets?.categories[category] ?? 0})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {facets && <PriceRange search={search} range={facets.priceRange} onChange={onChange} />}

      <section aria-labelledby={`${id}-rede`}>
        <h2 id={`${id}-rede`} className={groupTitle}>
          Rede
        </h2>
        <ul className="space-y-1">
          {NETWORKS.map((network) => {
            const active = search.network === network
            return (
              <li key={network}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ network: active ? undefined : network })}
                  className={cn(optionClass, active && 'bg-surface-dark')}
                >
                  <span>{NETWORK_LABEL[network]}</span>
                  <span className="tabular-nums">({facets?.networks[network] ?? 0})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

// O slider trabalha em centésimos de ETH (inteiros); a URL recebe strings decimais
function PriceRange({
  search,
  range,
  onChange,
}: {
  search: NftSearch
  range: Facets['priceRange']
  onChange: Props['onChange']
}) {
  const toCents = (value: string) => new Decimal(value).times(100).toDecimalPlaces(0).toNumber()
  const fromCents = (cents: number) => new Decimal(cents).dividedBy(100).toFixed(2)

  const min = toCents(range.min)
  const max = toCents(range.max)
  const current: [number, number] = [
    search.minPrice ? toCents(search.minPrice) : min,
    search.maxPrice ? toCents(search.maxPrice) : max,
  ]
  // Estado local: arrastar não dispara busca; só "Aplicar"
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const id = useId()
  const value = draft ?? current

  return (
    <section aria-labelledby={`${id}-preco`}>
      <h2 id={`${id}-preco`} className={groupTitle}>
        Faixa de preço
      </h2>
      <div className="space-y-4 px-3">
        <Slider
          min={min}
          max={max}
          step={1}
          minStepsBetweenThumbs={1}
          value={value}
          onValueChange={(next) => setDraft([next[0], next[1]])}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
        />
        <p className="text-body" aria-live="polite">
          Preço: {formatEthBr(fromCents(value[0]))} - {formatEthBr(fromCents(value[1]))} ETH
        </p>
        <button
          type="button"
          onClick={() => {
            onChange({
              minPrice: value[0] > min ? fromCents(value[0]) : undefined,
              maxPrice: value[1] < max ? fromCents(value[1]) : undefined,
            })
            setDraft(null)
          }}
          className="rounded bg-primary px-3 py-1.5 font-bold text-primary-foreground hover:bg-primary-light"
        >
          Aplicar
        </button>
      </div>
    </section>
  )
}
