import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from './hooks'

// Ícone do carrinho com o número de unidades (Figma: bolinha laranja sobre o ícone)
export function CartLink({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  const label = count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'

  return (
    <Link to="/carrinho" aria-label={label} className={cn('relative', className)} activeProps={{ className: 'text-primary' }}>
      <ShoppingCart className={iconClassName ?? 'size-6'} aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-tiny font-bold text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
