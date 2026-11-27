import { useMemo } from 'react'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Star } from 'lucide-react'
import { nftSummarySchema, type Nft } from '@/contracts/nft'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { NftGallery, NftGallerySkeleton } from './NftGallery'
import { NftTabs } from './NftTabs'
import { PurchasePanel } from './PurchasePanel'

const gridClass = 'grid gap-6 lg:grid-cols-[minmax(0,572px)_minmax(0,1fr)] lg:gap-8'

function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/' }))}
      className="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full border border-border-soft bg-background/80 text-primary hover:bg-background md:hidden"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
    </button>
  )
}

export function NftDetail({ nft }: { nft: Nft }) {
  const title = `${nft.name} ${formatTokenNumber(nft.tokenNumber)}`
  // Os favoritos guardam só o resumo (o mesmo formato dos cards)
  const summary = useMemo(() => nftSummarySchema.parse(nft), [nft])

  return (
    <article aria-labelledby="nft-titulo">
      <nav aria-label="Trilha" className="mb-4 hidden text-caption font-bold md:block">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link to="/" className="hover:text-primary">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-primary">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-muted-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <div className={gridClass}>
        <NftGallery
          images={nft.gallery.length > 0 ? nft.gallery : [nft.image]}
          title={title}
          overlay={
            <>
              <BackButton />
              <FavoriteButton nft={summary} className="absolute top-3 right-3 md:hidden" />
            </>
          }
        />

        <div className="min-w-0 rounded-t-3xl bg-card px-4 py-6 md:bg-transparent md:p-0">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h1 id="nft-titulo" className="text-title font-bold md:text-heading">{title}</h1>
            <p
              className="flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-caption md:border-0"
              aria-label={`Avaliação ${nft.rating.toFixed(1)} de 5, ${nft.reviewCount} avaliações de colecionadores`}
            >
              <Star className="size-3.5 fill-current text-primary" aria-hidden="true" />
              <span aria-hidden="true">
                {nft.rating.toFixed(1)} ({nft.reviewCount})
              </span>
            </p>
          </div>
          <p className="mt-1 flex items-baseline gap-2 text-title font-bold text-text-accent">
            <span className="sr-only">Preço por unidade: </span>
            {formatEth(nft.priceEth)}
            {nft.originalPriceEth && (
              <span className="text-body font-normal text-muted-foreground line-through">
                <span className="sr-only">Preço original: </span>
                {formatEth(nft.originalPriceEth)}
              </span>
            )}
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <h2 className="text-caption font-bold">Sobre este NFT:</h2>
            <p className="mt-2 text-caption text-muted-foreground">{nft.summary}</p>
          </div>

          <div className="mt-4">
            {/* key: ao navegar para outro NFT, edição e quantidade recomeçam */}
            <PurchasePanel key={nft.id} nft={nft} summary={summary} />
          </div>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-caption text-muted-foreground">
            <dt>ID do token:</dt>
            <dd>#{String(nft.tokenNumber).padStart(4, '0')}</dd>
            <dt>Coleção:</dt>
            <dd>{nft.collection}</dd>
            <dt>Atributos:</dt>
            <dd>{nft.attributes.join(', ')}</dd>
            <dt>Criador:</dt>
            <dd>{nft.creator}</dd>
            <dt>Rede:</dt>
            <dd>{NETWORK_LABEL[nft.network]}</dd>
            <dt>Contrato:</dt>
            <dd className="break-all">{nft.contractAddress}</dd>
            <dt>Padrão:</dt>
            <dd>{nft.tokenStandard}</dd>
            <dt>Royalties:</dt>
            <dd>{nft.royaltyPercent}%</dd>
          </dl>
        </div>
      </div>

      <NftTabs nft={nft} />
    </article>
  )
}

// Mesma estrutura do detalhe, para a página não "pular" quando os dados chegam
export function NftDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT">
      <div className="skeleton mb-4 hidden h-5 w-64 rounded md:block" />
      <div className={gridClass}>
        <NftGallerySkeleton />
        <div className="space-y-4 px-4 py-6 md:p-0">
          <div className="skeleton h-9 w-3/4 rounded" />
          <div className="skeleton h-7 w-28 rounded" />
          <div className="skeleton h-20 rounded" />
          <div className="skeleton h-8 w-72 rounded-full" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-12 w-full rounded" />
          <div className="skeleton h-40 rounded" />
        </div>
      </div>
    </div>
  )
}
