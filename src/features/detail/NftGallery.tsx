import { useState, type ReactNode } from 'react'
import { smallImage, srcSetFor } from '@/lib/images'
import { cn } from '@/lib/utils'

// Galeria do detalhe: miniaturas (coluna à esquerda no desktop, faixa abaixo no mobile)
// e imagem principal. "overlay" recebe os botões sobre a imagem no mobile (voltar e coração).
export function NftGallery({ images, title, overlay }: { images: string[]; title: string; overlay?: ReactNode }) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <section aria-label="Galeria" className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-7">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-card lg:w-111 lg:shrink-0 lg:p-5">
        <img
          data-testid="gallery-main"
          // sizes antes de srcSet/src: o React aplica os atributos em ordem
          sizes="(min-width: 1024px) 404px, 100vw"
          src={current}
          srcSet={srcSetFor(current)}
          alt={`${title}, imagem ${selected + 1} de ${images.length}`}
          width={960}
          height={960}
          fetchPriority="high"
          className="size-full object-cover lg:rounded-3xl"
        />
        {overlay}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-3 lg:w-25 lg:shrink-0 lg:flex-col lg:gap-4" aria-label="Miniaturas">
          {images.map((image, index) => (
            <li key={index} className="w-1/4 lg:w-full">
              <button
                type="button"
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={cn(
                  'block aspect-square w-full overflow-hidden rounded-lg border-2 border-transparent transition-colors hover:border-primary/60',
                  index === selected && 'border-primary',
                )}
              >
                <img src={smallImage(image)} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NftGallerySkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-7" aria-hidden="true">
      <div className="skeleton aspect-square w-full rounded-3xl lg:w-111 lg:shrink-0" />
      <div className="flex gap-3 lg:w-25 lg:flex-col lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton aspect-square w-1/4 rounded-lg lg:w-full" />
        ))}
      </div>
    </div>
  )
}
