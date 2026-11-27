import { Link } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'

const item =
  'flex size-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary'

// Barra inferior do Figma mobile. Some a partir de md (768px), onde entra o cabeçalho.
export function MobileTabBar() {
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-18 max-w-md items-center justify-around px-4">
        <li>
          <Link
            to="/"
            aria-label="Início"
            className={item}
            activeOptions={{ exact: true, includeSearch: false }}
            activeProps={{ className: 'text-primary' }}
          >
            <House className="size-6" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link to="/favoritos" aria-label="Favoritos" className={item} activeProps={{ className: 'text-primary' }}>
            <Heart className="size-6" aria-hidden="true" />
          </Link>
        </li>
        <li className="-mt-10">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Explorar catálogo"
            className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-background hover:bg-primary-light"
          >
            <ScanLine className="size-7" aria-hidden="true" />
          </Link>
        </li>
        <li>
          {/* Rota criada no pedaço do carrinho; até lá cai na página 404 */}
          <a href="/carrinho" aria-label="Carrinho" className={item}>
            <ShoppingCart className="size-6" aria-hidden="true" />
          </a>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" className={item} activeProps={{ className: 'text-primary' }}>
            <User className="size-6" aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
