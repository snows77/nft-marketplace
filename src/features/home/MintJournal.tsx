import { notifyUnavailable } from '@/lib/unavailable'
import { srcSetFor } from '@/lib/images'
import { JOURNAL_POSTS } from './content'

// "Diário da Cunhagem" (Figma): conteúdo editorial estático, fora do escopo da demo
export function MintJournal() {
  return (
    <section aria-labelledby="diario-titulo" className="py-12">
      <h2 id="diario-titulo" className="text-center text-heading font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-body text-tan">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {JOURNAL_POSTS.map((post) => (
          <article key={post.title} className="overflow-hidden rounded-xl bg-card">
            <img
              // sizes antes de srcSet/src: o React aplica os atributos em ordem e a imagem
              // começaria a baixar sem saber o tamanho de exibição (pegando a maior)
              sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 100vw"
              src={post.image}
              srcSet={srcSetFor(post.image)}
              alt=""
              width={270}
              height={195}
              loading="lazy"
              className="aspect-[268/195] w-full object-cover"
            />
            <div className="space-y-2 p-4">
              <p className="text-2xs text-tan">
                {post.date} <span aria-hidden="true">|</span> {post.readTime}
              </p>
              <h3 className="text-body font-bold">{post.title}</h3>
              <p className="text-caption text-tan">{post.text}</p>
              <button type="button" onClick={notifyUnavailable} className="text-caption text-primary hover:underline">
                Ler mais <span aria-hidden="true">→</span>
                <span className="sr-only">: {post.title}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
