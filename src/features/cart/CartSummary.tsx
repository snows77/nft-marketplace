import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { ApiRequestError } from '@/api/errors'
import type { Cart } from '@/contracts/cart'
import { formatEth } from '@/lib/format'
import { useApplyCoupon, useRemoveCoupon } from './hooks'

const row = 'flex items-baseline justify-between gap-4 text-body'

// "Resumo da carteira" (Figma): cupom, subtotal, desconto, taxa de rede e total.
// Todos os valores vêm da API; o cliente só exibe.
export function CartSummary({ cart }: { cart: Cart }) {
  const blocked = cart.items.some((item) => item.unavailable)

  return (
    <aside aria-label="Resumo da carteira" className="space-y-5 md:sticky md:top-6">
      <h2 className="hidden border-b border-border pb-3 text-title font-bold md:block">Resumo da carteira</h2>
      <CouponForm cart={cart} />

      <dl className="space-y-3">
        <div className={row}>
          <dt>Subtotal</dt>
          <dd data-testid="subtotal" className="tabular-nums">
            {formatEth(cart.subtotalEth)}
          </dd>
        </div>
        <div className={row}>
          <dt>{cart.coupon?.label ?? 'Desconto do lançamento'}</dt>
          <dd data-testid="desconto" className="tabular-nums">
            (-) {cart.coupon ? formatEth(cart.discountEth) : '0.00'}
          </dd>
        </div>
        <div className={row}>
          <dt>Taxa de rede</dt>
          <dd className="text-right">
            <span data-testid="taxa" className="tabular-nums">
              {formatEth(cart.networkFeeEth)}
            </span>
            <span className="block text-2xs text-primary">Taxa estimada</span>
          </dd>
        </div>
        <div className={`${row} border-t border-border pt-4 font-bold`}>
          <dt>Total</dt>
          <dd data-testid="total" className="text-title text-text-accent tabular-nums">
            {formatEth(cart.totalEth)}
          </dd>
        </div>
      </dl>

      {blocked && (
        <p role="alert" className="text-caption text-coral">
          Ajuste os itens indisponíveis para finalizar a compra.
        </p>
      )}
      <Link
        to="/checkout"
        disabled={blocked}
        aria-disabled={blocked || undefined}
        className="flex h-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-light aria-disabled:cursor-not-allowed aria-disabled:opacity-50 md:rounded"
      >
        Conectar e finalizar
      </Link>
      <Link to="/" hash="catalogo" className="block text-center text-body text-primary hover:underline">
        Continuar explorando
      </Link>
    </aside>
  )
}

function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const inputId = useId()
  const errorId = `${inputId}-erro`
  const apiError = apply.error instanceof ApiRequestError ? apply.error : null
  const error = apiError ? (apiError.fieldErrors?.code?.[0] ?? apiError.message) : apply.error ? 'Não foi possível aplicar o cupom.' : null

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded border border-primary px-3 py-2 text-caption">
        <span>
          Cupom <strong>{cart.coupon.code}</strong> aplicado ({cart.coupon.discountPercent}% de desconto)
        </span>
        <button
          type="button"
          aria-label={`Remover cupom ${cart.coupon.code}`}
          disabled={remove.isPending}
          onClick={() => remove.mutate(undefined)}
          className="rounded p-1 hover:text-coral"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) apply.mutate(code.trim(), { onSuccess: () => setCode('') })
      }}
      className="space-y-1"
    >
      <label htmlFor={inputId} className="text-caption font-bold">
        Código promocional
      </label>
      <div className="flex overflow-hidden rounded-full border border-border-soft md:rounded">
        <input
          id={inputId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (apply.error) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-caption placeholder:text-tan"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="rounded-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-60 md:rounded-none"
        >
          Aplicar
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-caption text-coral">
          {error}
        </p>
      )}
    </form>
  )
}
