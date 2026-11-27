import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { srcSetFor } from '@/lib/images'
import { PROMO_BANNERS } from './content'

// Dois banners do Figma: imagem à esquerda, chamada e "Explorar →" à direita
export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="grid gap-6 py-10 md:grid-cols-2 md:gap-8">
      {PROMO_BANNERS.map((banner) => (
        <article key={banner.title} className="grid grid-cols-[45%_1fr] overflow-hidden rounded-2xl bg-card">
          <img
            // sizes antes de srcSet/src: o React aplica os atributos em ordem e a imagem
            // começaria a baixar sem saber o tamanho de exibição (pegando a maior)
            sizes="(min-width: 768px) 290px, 45vw"
            src={banner.image}
            srcSet={srcSetFor(banner.image)}
            alt=""
            width={290}
            height={290}
            loading="lazy"
            className="aspect-square size-full rounded-br-3xl object-cover"
          />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right md:p-6">
            <h2 className="text-body font-bold md:text-title">{banner.title}</h2>
            <p className="hidden text-caption text-primary-light sm:block md:text-body">{banner.text}</p>
            <Link
              to="/"
              search={{ tab: banner.tab }}
              hash="catalogo"
              className="inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-caption font-bold text-primary-foreground hover:bg-primary-light md:text-body"
            >
              Explorar
              <ArrowRight className="size-4" aria-hidden="true" />
              <span className="sr-only">{banner.title}</span>
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
