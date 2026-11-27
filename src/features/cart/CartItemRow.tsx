import { Minus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import type { CartItem } from '@/contracts/cart'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { smallImage } from '@/lib/images'
import { useRemoveCartItem, useUpdateCartItem } from './hooks'

const stepButton =
  'flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40'

// Uma linha do carrinho: no desktop vira uma linha da "tabela" do Figma
// (NFT | Preço | Edições | Total | lixeira); no mobile, um card com imagem à esquerda.
export function CartItemRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  const title = `${item.name} ${formatTokenNumber(item.tokenNumber)}`
  const maxQuantity = Math.max(item.available, 1)

  return (
    <li className="grid grid-cols-[96px_1fr] items-center gap-x-4 overflow-hidden rounded-xl bg-card md:grid-cols-[70px_1fr_120px_130px_110px_48px] md:rounded-none">
      <img
        src={smallImage(item.image)}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        className="row-span-2 aspect-square size-full object-cover md:row-span-1 md:size-[70px]"
      />

      <div className="min-w-0 py-3 pr-3 md:py-0">
        <p className="truncate text-body font-bold">{title}</p>
        <p className="text-caption text-tan">
          ID do token: #{String(item.tokenNumber).padStart(4, '0')} · Edição: {item.editionLabel}
        </p>
        {/* Mobile: preço abaixo do nome */}
        <p className="mt-1 text-body font-bold text-text-accent md:hidden">{formatEth(item.lineTotalEth)}</p>
        {item.previousUnitPriceEth && (
          <p className="mt-1 flex items-center gap-1 text-caption text-amber" role="status">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            Preço atualizado: de {formatEth(item.previousUnitPriceEth)} para {formatEth(item.unitPriceEth)}
          </p>
        )}
        {item.unavailable && (
          <p className="mt-1 flex items-center gap-1 text-caption text-coral" role="alert">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            {item.available === 0
              ? 'Esta edição esgotou. Remova o item para continuar.'
              : `Só há ${item.available} disponíveis. Ajuste a quantidade.`}
          </p>
        )}
      </div>

      <p className="hidden text-body font-bold text-text-accent md:block">{formatEth(item.unitPriceEth)}</p>

      <div className="col-start-2 flex items-center gap-3 pb-3 md:col-start-auto md:pb-0">
        <button
          type="button"
          aria-label={`Diminuir quantidade de ${title}`}
          disabled={busy || item.quantity <= 1}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
          className={stepButton}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <span data-testid="quantidade" aria-live="polite" className="min-w-5 text-center text-body tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          aria-label={`Aumentar quantidade de ${title}`}
          disabled={busy || item.quantity >= maxQuantity}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
          className={stepButton}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
        {/* Mobile: lixeira ao lado da quantidade */}
        <RemoveButton title={title} disabled={busy} onRemove={() => remove.mutate(item.id)} className="ml-auto mr-3 md:hidden" />
      </div>

      <p className="hidden text-body font-bold text-text-accent md:block">{formatEth(item.lineTotalEth)}</p>
      <RemoveButton title={title} disabled={busy} onRemove={() => remove.mutate(item.id)} className="hidden md:flex" />
    </li>
  )
}

function RemoveButton({
  title,
  disabled,
  onRemove,
  className,
}: {
  title: string
  disabled: boolean
  onRemove: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={`Remover ${title} do carrinho`}
      disabled={disabled}
      onClick={onRemove}
      className={`items-center justify-center rounded p-2 text-tan hover:text-coral disabled:opacity-40 ${className ?? ''}`}
    >
      <Trash2 className="size-5" aria-hidden="true" />
    </button>
  )
}
