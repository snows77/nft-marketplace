import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts/nft'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { smallImage, srcSetFor } from '@/lib/images'

const RARITY_BADGE: Partial<Record<NftSummary['rarity'], string>> = {
  raro: 'RARO',
  epico: 'ÉPICO',
  lendario: 'LENDÁRIO',
}

// Card do catálogo (Figma): imagem numa moldura escura, selo de raridade colado à
// esquerda, nome com o número do token e preço (com o original riscado, se houver).
// O coração fica fora do link (botão dentro de link é HTML inválido), posicionado sobre
// o canto superior direito da imagem. No desktop aparece no hover/foco ou se favoritado.
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const title = `${nft.name} ${formatTokenNumber(nft.tokenNumber)}`
  const badge = RARITY_BADGE[nft.rarity]

  return (
    <div className="group relative">
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className="relative aspect-[258/300] overflow-hidden rounded-2xl bg-card p-2 md:rounded-none md:p-1">
          {/* <picture> com regra explícita: no celular (até 767px, card ≈ 150px) sempre a
              versão de 480px. Só com srcset/sizes o Chrome às vezes escolhia a de 960px. */}
          <picture>
            <source media="(max-width: 767px)" srcSet={smallImage(nft.image)} />
            <img
              // sizes antes de srcSet/src: o React aplica os atributos em ordem
              sizes="(min-width: 1024px) 260px, 350px"
              src={nft.image}
              srcSet={srcSetFor(nft.image)}
              alt={title}
              width={400}
              height={400}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className="absolute inset-x-2 top-1/2 aspect-square w-[calc(100%-1rem)] -translate-y-1/2 rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] md:inset-x-1 md:w-[calc(100%-0.5rem)] motion-reduce:transition-none"
            />
          </picture>
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
      </Link>
      <FavoriteButton
        nft={nft}
        className="absolute top-4 right-4 md:top-2 md:right-2 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:aria-pressed:opacity-100"
      />
    </div>
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
