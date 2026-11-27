import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Wallet as WalletIcon } from 'lucide-react'
import { buyerSchema, type Buyer, type Quote } from '@/contracts/order'
import {
  NETWORK_LABELS,
  PROVIDER_LABELS,
  shortAddress,
  walletNetworkSchema,
  type Wallet,
  type WalletNetwork,
} from '@/contracts/wallet'
import type { Profile } from '@/contracts/auth'
import { AccountField, AccountSelect, FormAlert, primaryButtonClass } from '@/features/account/AccountField'
import { useCart } from '@/features/cart/hooks'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { smallImage } from '@/lib/images'
import { cn } from '@/lib/utils'
import { useCheckout } from './useCheckout'

interface Props {
  userId: string
  profile: Profile
  wallets: Wallet[]
}

// Pagamento (Figma): dados do colecionador + carteira e rede à esquerda; seus NFTs e
// valores à direita. Fluxo: conectar carteira → revisar (cotação da API) → confirmar.
export function CheckoutPage({ userId, profile, wallets }: Props) {
  const flow = useCheckout(userId)
  const cart = useCart()
  const [slot, setSlot] = useState<Wallet['slot'] | null>(wallets[0]?.slot ?? null)
  const wallet = wallets.find((w) => w.slot === slot) ?? null
  const [network, setNetwork] = useState<WalletNetwork | null>(wallet?.network ?? null)

  const form = useForm<Buyer>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      displayName: profile.displayName ?? profile.username,
      username: profile.username,
      email: profile.email,
      referralCode: '',
      note: '',
    },
  })
  const { errors } = form.formState
  const connected = flow.connection.state === 'conectada'
  const reviewing = !!flow.quote

  function chooseWallet(next: Wallet) {
    setSlot(next.slot)
    setNetwork(next.network)
    flow.disconnect() // trocar de carteira exige conectar de novo
    flow.clearQuote()
  }

  const onReview = form.handleSubmit(() => flow.review.mutate())
  const onConfirm = form.handleSubmit((buyer) => {
    if (!wallet || !network) return
    flow.confirm.mutate({ buyer, payment: { walletSlot: wallet.slot, network, provider: wallet.provider } })
  })

  if (flow.pending) {
    return (
      <div role="status" className="mx-auto max-w-md space-y-4 rounded-lg bg-card p-8 text-center">
        <Loader2 className="mx-auto size-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-title font-bold">Aguardando confirmação na rede…</p>
        <p className="text-caption text-tan">
          Seu pedido foi enviado. Você pode recarregar a página: o acompanhamento continua de onde parou.
        </p>
      </div>
    )
  }

  if (flow.refused && flow.order) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg bg-card p-8 text-center">
        <div role="alert" className="space-y-2">
          <p className="text-title font-bold text-coral">Pagamento não concluído</p>
          <p className="text-body">{flow.order.failureReason}</p>
        </div>
        <p className="text-caption text-tan">Seus itens continuam no carrinho.</p>
        <button type="button" className={primaryButtonClass} onClick={flow.acknowledgeRefusal}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={reviewing ? onConfirm : onReview} className="grid gap-10 lg:grid-cols-[1fr_405px]">
      <div className="space-y-8">
        <section aria-labelledby="perfil-colecionador" className="space-y-4">
          <h2 id="perfil-colecionador" className="text-title font-bold">
            Perfil do colecionador
          </h2>
          <fieldset disabled={reviewing} className="grid gap-4 md:grid-cols-2">
            <AccountField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
            <AccountField label="Nome de usuário" required error={errors.username?.message} {...form.register('username')} />
            <AccountField label="E-mail" type="email" required error={errors.email?.message} {...form.register('email')} />
            <AccountField label="Código de indicação" error={errors.referralCode?.message} {...form.register('referralCode')} />
            <div className="md:col-span-2">
              <label htmlFor="observacao" className="text-caption">
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="observacao"
                rows={3}
                {...form.register('note')}
                className="mt-1 w-full rounded border border-border-soft bg-transparent p-3 text-caption"
              />
            </div>
          </fieldset>
        </section>

        <section aria-labelledby="carteira-titulo" className="space-y-4">
          <h2 id="carteira-titulo" className="text-title font-bold">
            Carteira e rede
          </h2>
          {wallets.length === 0 ? (
            <p className="rounded bg-card p-4 text-body">
              Você ainda não tem carteira cadastrada.{' '}
              <Link to="/carteiras" className="text-primary underline">
                Cadastrar carteira
              </Link>
            </p>
          ) : (
            <fieldset disabled={reviewing} className="space-y-3">
              <legend className="sr-only">Carteira para pagamento</legend>
              {wallets.map((w) => (
                <label
                  key={w.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl bg-card p-4 has-checked:outline-2 has-checked:outline-primary"
                >
                  <input
                    type="radio"
                    name="carteira"
                    checked={slot === w.slot}
                    onChange={() => chooseWallet(w)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className="text-body">
                    <span className="font-bold">{w.label}</span> · {PROVIDER_LABELS[w.provider]}
                    <span className="block text-caption text-tan">
                      {shortAddress(w.address)} · Rede {NETWORK_LABELS[w.network]}
                    </span>
                  </span>
                </label>
              ))}
              <AccountSelect
                label="Rede"
                required
                placeholder="Selecione uma rede"
                value={network ?? ''}
                onChange={(e) => {
                  setNetwork(e.target.value as WalletNetwork)
                  flow.clearQuote()
                }}
                options={walletNetworkSchema.options.map((n) => ({ value: n, label: NETWORK_LABELS[n] }))}
              />
              <div className="flex flex-wrap items-center gap-3">
                {connected ? (
                  <>
                    <p className="flex items-center gap-2 text-body text-success" role="status">
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                      Carteira conectada
                    </p>
                    <button type="button" onClick={flow.disconnect} className="text-caption text-primary underline">
                      Desconectar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!wallet || flow.connection.state === 'conectando'}
                    onClick={() => wallet && flow.connect.mutate(wallet.slot)}
                    className="inline-flex items-center gap-2 rounded border border-primary px-4 py-2 font-bold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    <WalletIcon className="size-4" aria-hidden="true" />
                    {flow.connection.state === 'conectando' ? 'Conectando…' : 'Conectar carteira'}
                  </button>
                )}
              </div>
              {flow.connection.state === 'erro' && <FormAlert message={flow.connection.message} />}
            </fieldset>
          )}
        </section>
      </div>

      <aside aria-label="Seus NFTs" className="space-y-5">
        <h2 className="text-title font-bold">{reviewing ? 'Revise seu pedido' : 'Seus NFTs'}</h2>
        {flow.notice && <FormAlert message={flow.notice} />}
        {reviewing ? (
          <QuoteView quote={flow.quote!} />
        ) : cart.data && cart.data.items.length > 0 ? (
          <QuoteView quote={{ ...cart.data, couponCode: cart.data.coupon?.code ?? null }} />
        ) : (
          <p className="text-body">
            Seu carrinho está vazio.{' '}
            <Link to="/" className="text-primary underline">
              Explorar NFTs
            </Link>
          </p>
        )}

        {reviewing ? (
          <div className="space-y-3">
            <button type="submit" disabled={flow.confirm.isPending} className={cn(primaryButtonClass, 'w-full')}>
              {flow.confirm.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
            </button>
            <button type="button" onClick={flow.clearQuote} className="w-full text-caption text-primary underline">
              Voltar e editar
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!connected || flow.review.isPending}
            className={cn(primaryButtonClass, 'w-full')}
          >
            {flow.review.isPending ? 'Calculando…' : 'Revisar pedido'}
          </button>
        )}
        {!connected && !reviewing && wallets.length > 0 && (
          <p className="text-caption text-tan">Conecte a carteira para revisar o pedido.</p>
        )}
      </aside>
    </form>
  )
}

// Itens e valores (da cotação da API ou do carrinho atual)
function QuoteView({
  quote,
}: {
  quote: Pick<Quote, 'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth' | 'couponCode'> & {
    items: { nftId: string; editionId: string; editionLabel: string; name: string; tokenNumber: number; image: string; quantity: number; lineTotalEth: string }[]
  }
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {quote.items.map((item) => (
          <li key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 bg-card pr-3">
            <img src={smallImage(item.image)} alt="" width={56} height={56} className="size-14 object-cover" />
            <span className="min-w-0">
              <span className="block truncate text-body font-bold">
                {item.name} {formatTokenNumber(item.tokenNumber)}
              </span>
              <span className="text-caption text-tan">
                Edição {item.editionLabel} · (x {item.quantity})
              </span>
            </span>
            <span className="text-body font-bold text-text-accent">{formatEth(item.lineTotalEth)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 text-body">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatEth(quote.subtotalEth)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Desconto{quote.couponCode ? ` (${quote.couponCode})` : ' do lançamento'}</dt>
          <dd>(-) {quote.couponCode ? formatEth(quote.discountEth) : '0.00'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd>{formatEth(quote.networkFeeEth)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 font-bold">
          <dt>Total</dt>
          <dd className="text-title text-text-accent">{formatEth(quote.totalEth)}</dd>
        </div>
      </dl>
    </div>
  )
}
