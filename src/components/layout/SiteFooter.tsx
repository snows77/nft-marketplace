import type { ComponentType, ComponentProps } from 'react'
import { Link } from '@tanstack/react-router'
import type { NftSearch } from '@/contracts/nft-search'
import { notifyUnavailable } from '@/lib/unavailable'
import { Container } from './Container'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from './SocialIcons'

const linkClass = 'text-caption text-foreground/90 hover:text-primary text-left'
const headingClass = 'mb-2 text-lg font-bold'

const COLLECTIONS: { label: string; category: NonNullable<NftSearch['category']> }[] = [
  { label: 'Arte digital', category: 'arte-digital' },
  { label: 'Fotografia', category: 'fotografia' },
  { label: 'Música', category: 'musica' },
  { label: 'Arte 3D', category: 'arte-3d' },
  { label: 'Utilidade', category: 'utilidade' },
]

const SOCIALS: { label: string; href: string; Icon: ComponentType<ComponentProps<'svg'>> }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
  { label: 'Twitter', href: 'https://x.com', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: YoutubeIcon },
]

function UnavailableLink({ children }: { children: string }) {
  return (
    <button type="button" className={linkClass} onClick={notifyUnavailable}>
      {children}
    </button>
  )
}

export function SiteFooter() {
  // pb-32 no mobile: espaço para a barra inferior fixa e o botão central que sobe acima dela
  return (
    <footer className="mt-16 pb-32 md:pb-0">
      <Container className="px-0 md:px-6 xl:px-0">
        <div className="grid gap-3 bg-surface-dark px-8 py-4 text-caption sm:grid-cols-2 lg:grid-cols-4">
          <p className="font-bold tracking-widest">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="hover:text-primary">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-primary">
            +55 11 4002 8922
          </a>
        </div>

        <div className="grid grid-cols-2 gap-8 bg-card px-8 py-8 lg:grid-cols-4">
          <nav aria-labelledby="rodape-perfil">
            <h2 id="rodape-perfil" className={headingClass}>
              Meu perfil
            </h2>
            <ul className="space-y-2">
              <li>
                <Link to="/perfil" className={linkClass}>
                  Meu perfil
                </Link>
              </li>
              {['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'].map((label) => (
                <li key={label}>
                  <UnavailableLink>{label}</UnavailableLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="rodape-ajuda">
            <h2 id="rodape-ajuda" className={headingClass}>
              Central de ajuda
            </h2>
            <ul className="space-y-2">
              {[
                'Central de ajuda',
                'Como comprar NFTs',
                'Carteira e segurança',
                'Política do mercado',
                'Denunciar item',
              ].map((label) => (
                <li key={label}>
                  <UnavailableLink>{label}</UnavailableLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="rodape-colecoes">
            <h2 id="rodape-colecoes" className={headingClass}>
              Coleções
            </h2>
            <ul className="space-y-2">
              {COLLECTIONS.map(({ label, category }) => (
                <li key={category}>
                  <Link to="/" search={{ category }} hash="catalogo" className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={headingClass}>Redes sociais</h2>
            <ul className="flex flex-wrap gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="flex size-8 items-center justify-center rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>

            <h2 className={`${headingClass} mt-6`}>Carteiras compatíveis</h2>
            <p className="inline-block rounded border border-border-soft bg-surface-dark px-2.5 py-1 text-2xs font-bold tracking-wider text-primary">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </Container>

      <p className="py-4 text-center text-caption">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
