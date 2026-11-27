import { useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { NftSummary } from '@/contracts/nft'
import { useSession } from '@/features/auth/session'
import { cn } from '@/lib/utils'
import { useFavoritesQuery, useToggleFavorite } from './hooks'

interface FavoriteButtonProps {
  nft: NftSummary
  // icon: só o coração (card e detalhe mobile); labeled: coração + "Favoritar" (detalhe desktop)
  variant?: 'icon' | 'labeled'
  className?: string
}

export function FavoriteButton({ nft, variant = 'icon', className }: FavoriteButtonProps) {
  const { user, isPending: sessionPending } = useSession()
  const favorites = useFavoritesQuery()
  const { toggle, pending } = useToggleFavorite(nft)
  const navigate = useNavigate()

  const isFavorite = favorites.data?.items.some((item) => item.id === nft.id) ?? false
  // aria-disabled em vez de disabled: o botão continua focável e o foco não se perde
  // enquanto a mutation roda
  const unavailable = sessionPending || (user != null && (favorites.data === undefined || pending))

  function onClick(event: React.MouseEvent) {
    // O card inteiro é um link: o clique no coração não pode abrir o detalhe
    event.preventDefault()
    event.stopPropagation()
    if (unavailable) return
    if (!user) {
      // Visitante: abre o login na mesma página, sem favoritar escondido
      void navigate({ to: '.', search: (prev) => ({ ...prev, auth: 'entrar' as const }) })
      return
    }
    toggle(!isFavorite)
  }

  const label = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
  const icon = (
    <Heart className={cn('size-5 shrink-0', isFavorite && 'fill-current')} aria-hidden="true" />
  )

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      aria-disabled={unavailable || undefined}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center text-primary transition-colors aria-disabled:cursor-progress',
        variant === 'icon'
          ? 'size-9 rounded-full border border-border-soft bg-background/80 hover:bg-background'
          : 'h-10 gap-2 rounded border border-primary px-3 text-caption hover:bg-surface-dark',
        className,
      )}
    >
      {icon}
      {variant === 'labeled' && <span aria-hidden="true">{isFavorite ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  )
}
