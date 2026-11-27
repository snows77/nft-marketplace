import { Star } from 'lucide-react'
import { Tabs } from 'radix-ui'
import type { Nft } from '@/contracts/nft'
import { NETWORK_LABEL } from '@/features/catalog/labels'

const trigger =
  'border-b-2 border-transparent pb-2 text-left text-body whitespace-nowrap hover:text-primary data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-text-accent'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

// Abas "Detalhes do NFT" / "Avaliações de colecionadores" (Radix: setas do teclado e ARIA prontos)
export function NftTabs({ nft }: { nft: Nft }) {
  const network = NETWORK_LABEL[nft.network]

  return (
    <Tabs.Root defaultValue="detalhes" className="mt-12 lg:mt-20">
      <Tabs.List aria-label="Informações do NFT" className="flex gap-8 overflow-x-auto border-b border-border">
        <Tabs.Trigger value="detalhes" className={trigger}>
          Detalhes do NFT
        </Tabs.Trigger>
        <Tabs.Trigger value="avaliacoes" className={trigger}>
          Avaliações de colecionadores ({nft.reviewCount})
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="detalhes" className="mt-4 space-y-4 text-caption text-muted-foreground">
        {nft.description.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <dl className="space-y-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              <span className="break-all">{nft.contractAddress}</span> • Contrato inteligente {nft.tokenStandard}{' '}
              verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos
              mercados compatíveis.
            </dd>
          </div>
        </dl>
      </Tabs.Content>

      <Tabs.Content value="avaliacoes" className="mt-4 text-caption">
        <p className="text-muted-foreground">
          <span aria-hidden="true">★</span> {nft.rating.toFixed(1)} de 5 · {nft.reviewCount} avaliações. Mostrando as
          mais recentes.
        </p>
        <ul className="mt-4 space-y-4">
          {nft.reviews.map((review) => (
            <li key={review.id} className="rounded bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{review.author}</p>
                <p className="flex items-center gap-0.5 text-primary" aria-label={`Nota ${review.rating} de 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={i < review.rating ? 'size-3.5 fill-current' : 'size-3.5'} aria-hidden="true" />
                  ))}
                </p>
              </div>
              <p className="mt-2 text-muted-foreground">{review.comment}</p>
              <p className="mt-1 text-2xs text-muted-foreground">
                <time dateTime={review.createdAt}>{dateFormat.format(new Date(review.createdAt))}</time>
              </p>
            </li>
          ))}
        </ul>
      </Tabs.Content>
    </Tabs.Root>
  )
}
