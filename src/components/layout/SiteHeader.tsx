import { Link } from '@tanstack/react-router'
import { LogIn, Search } from 'lucide-react'
import { notifyUnavailable } from '@/lib/unavailable'
import { useSession } from '@/features/auth/session'
import { UserMenu } from '@/features/auth/UserMenu'
import { CartLink } from '@/features/cart/CartLink'
import { Container } from './Container'

const navItem =
  'relative py-5 text-body text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring'
const activeItem =
  'text-primary font-bold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'

// Cabeçalho do desktop/tablet. No mobile a navegação fica na barra inferior.
export function SiteHeader() {
  const { user, isPending } = useSession()

  return (
    <header className="hidden md:block">
      <Container className="flex items-center justify-between border-b border-border">
        <Link to="/" className="py-5 text-caption font-bold tracking-widest" aria-label="Kurio, início">
          KURIO
        </Link>

        <nav aria-label="Navegação principal">
          <ul className="flex items-center gap-10">
            <li>
              <Link
                to="/"
                className={navItem}
                activeOptions={{ exact: true, includeSearch: false }}
                activeProps={{ className: activeItem }}
              >
                Início
              </Link>
            </li>
            <li>
              {/* includeHash: só é "página atual" quando a URL tem #catalogo (senão disputa com Início) */}
              <Link to="/" hash="catalogo" className={navItem} activeOptions={{ exact: true, includeHash: true }}>
                Mercado
              </Link>
            </li>
            <li>
              <button type="button" className={navItem} onClick={notifyUnavailable}>
                Criadores
              </button>
            </li>
            <li>
              <button type="button" className={navItem} onClick={notifyUnavailable}>
                Aprenda
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            hash="catalogo"
            activeOptions={{ exact: true, includeHash: true }}
            aria-label="Buscar NFTs"
            className="rounded p-1 hover:text-primary"
          >
            <Search className="size-6" aria-hidden="true" />
          </Link>
          <CartLink className="rounded p-1 hover:text-primary" />
          {isPending ? (
            // Reserva o espaço enquanto a sessão carrega, sem "piscar" o botão Entrar
            <span className="h-9 w-24" aria-hidden="true" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              to="."
              search={(prev) => ({ ...prev, auth: 'entrar' as const })}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-2.5 py-1.5 text-body font-bold text-primary-foreground hover:bg-primary-light"
            >
              <LogIn className="size-5" aria-hidden="true" />
              Entrar
            </Link>
          )}
        </div>
      </Container>
    </header>
  )
}
