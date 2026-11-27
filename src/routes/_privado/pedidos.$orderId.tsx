import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { fetchOrder } from '@/api/orders'
import { isAwaitingConfirmation } from '@/features/checkout/useCheckout'
import { ApiRequestError } from '@/api/errors'
import { Container } from '@/components/layout/Container'
import { NETWORK_LABELS, PROVIDER_LABELS, shortAddress } from '@/contracts/wallet'
import { formatEth, formatTokenNumber } from '@/lib/format'
import { smallImage } from '@/lib/images'

// Recibo (Figma: modal de confirmação). Reproduz o snapshot do pedido: os valores vêm
// do pedido, nunca do catálogo atual. Só mostra "confirmado" quando a API confirmou.
export const Route = createFileRoute('/_privado/pedidos/$orderId')({
  component: ReceiptPage,
})

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function ReceiptPage() {
  const { orderId } = Route.useParams()
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    refetchInterval: (query) => (isAwaitingConfirmation(query.state.data) ? 1000 : false),
  })

  if (order.isPending) {
    return (
      <Container className="py-12">
        <div role="status" aria-label="Carregando pedido" className="skeleton mx-auto h-[600px] max-w-[578px] rounded" />
      </Container>
    )
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiRequestError && order.error.code === 'NOT_FOUND'
    return (
      <Container className="py-12">
        <div role="alert" className="mx-auto max-w-md space-y-4 rounded bg-card p-8 text-center">
          <p className="text-title font-bold">{notFound ? 'Pedido não encontrado.' : 'Não foi possível carregar o pedido.'}</p>
          {notFound ? (
            <Link to="/" className="text-primary underline">
              Voltar ao início
            </Link>
          ) : (
            <button type="button" onClick={() => order.refetch()} className="text-primary underline">
              Tentar de novo
            </button>
          )}
        </div>
      </Container>
    )
  }

  const data = order.data
  // Só mostra o recibo com a confirmação completa da API (inclui a transação)
  if (data.status !== 'confirmado' || !data.transactionHash) {
    return (
      <Container className="py-12">
        <div role="status" className="mx-auto max-w-md space-y-3 rounded bg-card p-8 text-center">
          <p className="text-title font-bold">
            {data.status === 'recusado' ? 'Pagamento não concluído' : 'Aguardando confirmação na rede…'}
          </p>
          {data.failureReason && <p>{data.failureReason}</p>}
          <Link to="/carrinho" className="text-primary underline">
            Voltar ao carrinho
          </Link>
        </div>
      </Container>
    )
  }

  const network = NETWORK_LABELS[data.payment.network]
  return (
    <Container className="py-12">
      <article aria-labelledby="recibo-titulo" className="mx-auto max-w-[578px] border-b-8 border-primary bg-card">
        <header className="px-6 pt-8 pb-5 text-center">
          <MailCheck className="mx-auto size-16 text-primary" aria-hidden="true" />
          <h1 id="recibo-titulo" className="mt-4 text-body font-bold text-primary-light">
            Seus NFTs agora estão na sua carteira
          </h1>
        </header>
        <dl className="grid grid-cols-2 gap-3 border-y border-primary px-6 py-3 text-caption sm:grid-cols-4">
          <div>
            <dt className="font-bold text-primary-light">ID da transação</dt>
            <dd className="text-tan">{shortAddress(data.transactionHash ?? '')}</dd>
          </div>
          <div>
            <dt className="text-primary-light">Data</dt>
            <dd className="text-tan">{dateFormat.format(new Date(data.updatedAt))}</dd>
          </div>
          <div>
            <dt className="text-primary-light">Total</dt>
            <dd className="text-tan">{formatEth(data.totalEth)}</dd>
          </div>
          <div>
            <dt className="font-bold text-primary-light">Carteira</dt>
            <dd className="text-tan">{PROVIDER_LABELS[data.payment.provider]}</dd>
          </div>
        </dl>

        <section aria-labelledby="detalhes-transacao" className="px-6 py-6 sm:px-11">
          <h2 id="detalhes-transacao" className="text-body font-bold">
            Detalhes da transação
          </h2>
          <p className="mt-1 text-caption text-tan">Pedido {data.id}</p>
          <ul className="mt-4 space-y-3 border-t border-border pt-4">
            {data.items.map((item) => (
              <li key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[70px_1fr_auto_auto] items-center gap-3">
                <img src={smallImage(item.image)} alt="" width={70} height={70} className="size-[70px] rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-body font-bold">
                    {item.name} {formatTokenNumber(item.tokenNumber)}
                  </span>
                  <span className="text-caption text-tan">Edição {item.editionLabel}</span>
                </span>
                <span className="text-caption">(x {item.quantity})</span>
                <span className="text-body font-bold text-text-accent">{formatEth(item.lineTotalEth)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-b border-border pb-3 text-body">
            {data.couponCode && (
              <div className="flex justify-between">
                <dt>Desconto ({data.couponCode})</dt>
                <dd>(-) {formatEth(data.discountEth)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(data.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd data-testid="recibo-total" className="text-text-accent">
                {formatEth(data.totalEth)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-center text-caption text-tan">
            Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na
            rede.
          </p>
          <p className="mt-2 text-center text-2xs text-muted-foreground">
            Referência e link de exploração simulados (demonstração).
          </p>
          {data.explorerUrl && (
            <div className="mt-5 text-center">
              <a
                href={data.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded bg-primary px-4 py-2.5 font-bold text-primary-foreground hover:bg-primary-light"
              >
                Ver no {data.payment.network === 'ethereum' ? 'Etherscan' : data.payment.network === 'polygon' ? 'Polygonscan' : 'Solscan'}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          )}
        </section>
      </article>
    </Container>
  )
}
