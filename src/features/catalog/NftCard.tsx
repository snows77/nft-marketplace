import type { NftSummary } from '@/contracts/nft'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { srcSetFor } from '@/lib/images'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const title = `${nft.name} ${formatTokenNumber(nft.tokenNumber)}`

  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-card p-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl">
        <img
          src={nft.image}
          srcSet={srcSetFor(nft.image)}
          // Larguras medidas do card: 3 colunas no desktop, 2 no tablet/celular
          sizes="(min-width: 1024px) 380px, (min-width: 768px) 350px, calc(50vw - 48px)"
          alt={title}
          width={400}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="size-full object-cover"
        />
        {nft.rarity === 'raro' && (
          <span className="absolute left-0 top-3 bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            RARO
          </span>
        )}
      </div>

      <div className="px-1 pb-1">
        <h3 className="truncate text-sm">{title}</h3>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-bold text-text-accent">{formatEth(nft.priceEth)}</span>
          {nft.originalPriceEth && (
            <span className="text-sm text-muted-foreground line-through">
              <span className="sr-only">Preço original: </span>
              {formatEth(nft.originalPriceEth)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}

// Mesmas dimensões do card real, para não haver deslocamento de layout (CLS)
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-3" aria-hidden="true">
      <div className="skeleton aspect-square rounded-2xl" />
      <div className="space-y-2 px-1 pb-1">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-5 w-1/3 rounded" />
      </div>
    </div>
  )
}