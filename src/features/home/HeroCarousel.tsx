import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { NftSummary } from '@/contracts/nft'
import { formatTokenNumber } from '@/lib/format'
import { srcSetFor } from '@/lib/images'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const AUTOPLAY_MS = 6000
// Enquanto os destaques carregam (ou se a API falhar), o hero usa a arte do Figma
const FALLBACK = { image: '/images/nfts/emerald-ape.webp', alt: 'Emerald Ape #042' }

// Hero do Figma: chamada + imagem do NFT destacado + 3 bolinhas.
// Carrossel acessível: slides nomeados "N de 3", bolinhas com nome, autoplay pausado
// em hover/foco e desligado quando a pessoa prefere menos movimento.
export function HeroCarousel({ items }: { items: NftSummary[] | undefined }) {
  const slides = (items ?? []).slice(0, 3)
  const total = Math.max(slides.length, 1)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const current = slides[index % total]

  useEffect(() => {
    if (reducedMotion || paused || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [reducedMotion, paused, slides.length])

  const image = current?.image ?? FALLBACK.image
  const alt = current ? `${current.name} ${formatTokenNumber(current.tokenNumber)}` : FALLBACK.alt

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-surface-dark to-card p-5 md:mt-8 md:bg-none md:p-0"
    >
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${(index % total) + 1} de ${total}`}
        className="grid grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_450px] md:gap-10"
      >
        <div className="md:pl-10">
          <p className="text-caption font-bold md:text-body">Bem-vindo à Kurio</p>
          <h1 className="mt-2 text-lg leading-snug font-bold tracking-wider md:mt-4 md:text-display md:leading-[70px]">
            <span className="md:hidden">SEJA DONO DA CULTURA DIGITAL</span>
            <span className="hidden md:inline">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-caption text-tan md:mt-4 md:text-body md:text-primary-light">
            <span className="md:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
            <span className="hidden md:inline">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </span>
          </p>
          <Link
            to="/"
            hash="catalogo"
            className="mt-3 inline-flex items-center gap-2 text-caption font-bold text-primary md:mt-8 md:rounded md:bg-primary md:px-7 md:py-2.5 md:text-body md:text-primary-foreground md:hover:bg-primary-light"
          >
            EXPLORAR
            <ArrowRight className="size-4 md:hidden" aria-hidden="true" />
          </Link>
        </div>

        <div className="relative size-32 overflow-hidden rounded-2xl sm:size-40 md:size-[450px] md:rounded-3xl">
          <img
            key={image}
            // sizes antes de srcSet/src: o React aplica os atributos em ordem e a imagem
            // começaria a baixar sem saber o tamanho de exibição (pegando a maior)
            sizes="(min-width: 768px) 450px, 160px"
            src={image}
            srcSet={srcSetFor(image)}
            alt={alt}
            width={450}
            height={450}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="size-full object-cover motion-safe:animate-in motion-safe:fade-in-0"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2 md:absolute md:bottom-12 md:left-[52%] md:mt-0">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para o destaque ${i + 1}`}
            aria-current={i === index % total ? 'true' : undefined}
            onClick={() => setIndex(i)}
            // Área de toque de 24px com a bolinha de 10px do Figma no centro
            className="group flex size-6 items-center justify-center rounded-full"
          >
            <span
              className={cn(
                'size-2.5 rounded-full bg-primary transition-opacity',
                i === index % total ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
