import type { NftSummary } from '@/contracts/nft'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { srcSetFor } from '@/lib/images'

const RARITY_BADGE: Partial<Record<NftSummary['rarity'], string>> = {
  raro: 'RARO',
  epico: 'ÉPICO',
  lendario: 'LENDÁRIO',
}

// Card do catálogo (Figma): imagem numa moldura escura, selo de raridade colado à
// esquerda, nome com o número do token e preço (com o original riscado, se houver).
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const title = `${nft.name} ${formatTokenNumber(nft.tokenNumber)}`
  const badge = RARITY_BADGE[nft.rarity]

  return (
    // Rota de detalhe chega no pedaço 4; até lá o link cai na página 404
    <a href={`/nft/${nft.id}`} className="group block rounded-2xl focus-visible:outline-offset-4">
      <div className="relative aspect-[258/300] overflow-hidden rounded-2xl bg-card p-2 md:rounded-none md:p-1">
        <img
          src={nft.image}
          srcSet={srcSetFor(nft.image)}
          // Larguras medidas do card: 3 colunas no desktop, 2 no tablet/celular
          sizes="(min-width: 1024px) 260px, (min-width: 768px) 350px, calc(50vw - 48px)"
          alt={title}
          width={400}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="absolute inset-x-2 top-1/2 aspect-square w-[calc(100%-1rem)] -translate-y-1/2 rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] md:inset-x-1 md:w-[calc(100%-0.5rem)] motion-reduce:transition-none"
        />
        {badge && (
          <span className="absolute top-3 left-0 bg-primary px-2 py-1 text-caption font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>

      <h3 className="mt-3 truncate text-body group-hover:text-primary">{title}</h3>
      <p className="flex items-baseline gap-2 text-body">
        <span data-testid="nft-price" className="font-bold text-text-accent">
          {formatEth(nft.priceEth)}
        </span>
        {nft.originalPriceEth && (
          <span className="text-muted-foreground line-through">
            <span className="sr-only">Preço original: </span>
            {formatEth(nft.originalPriceEth)}
          </span>
        )}
      </p>
    </a>
  )
}

// Mesmas dimensões do card real, para não haver deslocamento de layout (CLS)
export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[258/300] rounded-2xl md:rounded-none" />
      <div className="skeleton mt-3 h-5 w-3/4 rounded" />
      <div className="skeleton mt-2 h-5 w-1/3 rounded" />
    </div>
  )
}
