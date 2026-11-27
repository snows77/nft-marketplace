import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ChartLine,
  CircleAlert,
  Download,
  Heart,
  ImageIcon,
  LogOut,
  MapPin,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { useLogout } from '@/features/auth/session'
import { notifyUnavailable } from '@/lib/unavailable'
import { cn } from '@/lib/utils'
import { useProfileQuery } from './hooks'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// Itens do menu "Meu perfil" do Figma que não fazem parte da entrega
const UNAVAILABLE: { label: string; Icon: Icon }[] = [
  { label: 'Atividade', Icon: ShoppingCart },
  { label: 'Ofertas', Icon: ChartLine },
  { label: 'Arquivos baixados', Icon: Download },
  { label: 'Suporte', Icon: CircleAlert },
]

// Desktop (lg+): lista vertical com marcador à esquerda no item ativo.
// Mobile/tablet: a mesma lista vira uma faixa horizontal rolável de "chips".
const itemClass =
  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-border-soft px-3 py-2 text-caption text-primary hover:bg-surface-dark lg:w-full lg:rounded-none lg:border-0 lg:border-l-4 lg:border-transparent lg:px-4 lg:py-3'
const activeClass = 'border-primary bg-surface-dark font-bold lg:border-primary lg:bg-transparent'

export function AvatarImage({ src, className }: { src: string | null | undefined; className?: string }) {
  return src ? (
    <img src={src} alt="Seu avatar" className={cn('rounded-full object-cover', className)} />
  ) : (
    <span className={cn('flex items-center justify-center rounded-full bg-surface-dark text-primary', className)}>
      <ImageIcon className="size-1/2" aria-hidden="true" />
    </span>
  )
}

export function AccountLayout({ children }: { children: ReactNode }) {
  const profile = useProfileQuery()
  const logout = useLogout()

  return (
    <Container className="py-6 lg:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-7">
        <aside className="min-w-0 shrink-0 rounded bg-card py-4 lg:w-77.5 lg:py-0 lg:pt-4">
          <nav aria-labelledby="menu-perfil-titulo">
            {/* Título das páginas de conta (perfil e carteiras); as seções usam h2 */}
            <h1 id="menu-perfil-titulo" className="px-4 text-lg font-bold lg:px-2.5">
              Meu perfil
            </h1>

            {/* Quem está logado: nome, e-mail e avatar atuais */}
            <div className="mt-3 flex items-center gap-3 px-4 lg:px-2.5">
              {profile.data ? (
                <>
                  <AvatarImage src={profile.data.avatarUrl} className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-caption font-bold">{profile.data.displayName}</p>
                    <p className="truncate text-2xs text-muted-foreground">{profile.data.email}</p>
                  </div>
                </>
              ) : (
                <div className="skeleton h-10 w-48 rounded" aria-hidden="true" />
              )}
            </div>

            <ul className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
              <li>
                <Link to="/perfil" className={itemClass} activeProps={{ className: activeClass }}>
                  <UserRound className="size-4" aria-hidden="true" />
                  Dados do perfil
                </Link>
              </li>
              <li>
                <Link to="/carteiras" className={itemClass} activeProps={{ className: activeClass }}>
                  <MapPin className="size-4" aria-hidden="true" />
                  Carteiras
                </Link>
              </li>
              <li>
                <Link to="/favoritos" className={itemClass} activeProps={{ className: activeClass }}>
                  <Heart className="size-4" aria-hidden="true" />
                  Lista de interesse
                </Link>
              </li>
              {UNAVAILABLE.map(({ label, Icon }) => (
                <li key={label}>
                  <button type="button" onClick={notifyUnavailable} className={itemClass}>
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                </li>
              ))}
              <li className="lg:border-t lg:border-border">
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className={cn(itemClass, 'font-bold')}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sair
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Container>
  )
}
