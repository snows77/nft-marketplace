import { useId, useState } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { Nft, NftSummary } from '@/contracts/nft'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { formatEth, multiplyEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAddToCart } from '@/features/cart/hooks'

const stepButton =
  'flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40'

// Edição, quantidade, total e ações de compra. A quantidade fica entre 1 e o disponível
// da edição escolhida; edições com disponível 0 aparecem desabilitadas ("Esgotada").
export function PurchasePanel({ nft, summary }: { nft: Nft; summary: NftSummary }) {
  const firstAvailable = nft.editions.find((edition) => edition.available > 0)
  const [editionId, setEditionId] = useState(firstAvailable?.id ?? null)
  const [quantity, setQuantity] = useState(1)
  const legendId = useId()
  const addToCartMutation = useAddToCart()
  const navigate = useNavigate()

  const edition = nft.editions.find((e) => e.id === editionId) ?? null
  const max = edition?.available ?? 0
  const soldOut = edition === null
  const atMax = !soldOut && quantity >= max

  function selectEdition(id: string) {
    setEditionId(id)
    setQuantity(1) // cada edição tem o seu limite: recomeça em 1
  }

  // "Comprar NFT" adiciona e leva ao carrinho; o ícone só adiciona e avisa.
  // A API confere a disponibilidade (409 OUT_OF_STOCK vira aviso no hook).
  function addToCart(goToCart: boolean) {
    if (!edition) return
    addToCartMutation.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/carrinho' })
          else
            toast.success('Adicionado ao carrinho.', {
              action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
            })
        },
      },
    )
  }
  const adding = addToCartMutation.isPending

  return (
    <div className="space-y-4">
      <div>
        <p id={legendId} className="text-caption font-bold">
          Edição:
        </p>
        <div role="radiogroup" aria-labelledby={legendId} className="mt-2 flex flex-wrap gap-2">
          {nft.editions.map((e) => {
            const disabled = e.available === 0
            return (
              <label
                key={e.id}
                className={cn(
                  'relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-soft px-3 py-1 text-caption has-checked:border-primary has-checked:bg-surface-dark has-checked:text-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                  disabled && 'cursor-not-allowed text-muted-foreground opacity-60',
                )}
              >
                <input
                  type="radio"
                  name={`edicao-${nft.id}`}
                  value={e.id}
                  checked={e.id === editionId}
                  disabled={disabled}
                  aria-label={disabled ? `${e.label}, esgotada` : e.label}
                  onChange={() => selectEdition(e.id)}
                  className="sr-only"
                />
                <span className={cn(disabled && 'line-through')}>{e.label}</span>
                {disabled && <span className="text-2xs" aria-hidden="true">Esgotada</span>}
              </label>
            )
          })}
        </div>
        {soldOut && (
          <p className="mt-2 text-caption text-coral" role="status">
            Todas as edições deste NFT estão esgotadas.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-caption font-bold" id={`${legendId}-qtd`}>
            Qtd.
          </span>
          <button
            type="button"
            aria-label="Diminuir quantidade"
            className={stepButton}
            disabled={soldOut || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <output
            data-testid="detail-quantity"
            aria-labelledby={`${legendId}-qtd`}
            aria-live="polite"
            className="w-6 text-center text-body"
          >
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            className={stepButton}
            disabled={soldOut || atMax}
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-title font-bold text-text-accent">
          <span className="sr-only">Total: </span>
          <span data-testid="detail-total">{formatEth(multiplyEth(nft.priceEth, quantity))}</span>
        </p>
      </div>
      <p className="min-h-5 text-2xs text-muted-foreground" aria-live="polite">
        {atMax && (max === 1 ? 'Máximo de 1 disponível nesta edição.' : `Máximo de ${max} disponíveis nesta edição.`)}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => addToCart(true)}
          disabled={soldOut || adding}
          className="h-12 flex-1 rounded-full bg-primary px-6 text-body font-bold text-primary-foreground hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:flex-none md:rounded"
        >
          Comprar NFT
        </button>
        <button
          type="button"
          aria-label="Adicionar ao carrinho"
          title="Adicionar ao carrinho"
          onClick={() => addToCart(false)}
          disabled={soldOut || adding}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary hover:bg-surface-dark disabled:cursor-not-allowed disabled:opacity-50 md:size-10 md:rounded md:border md:border-primary"
        >
          <ShoppingCart className="size-5" aria-hidden="true" />
        </button>
        <FavoriteButton nft={summary} variant="labeled" className="hidden md:inline-flex" />
      </div>
    </div>
  )
}
