import { useQuery } from '@tanstack/react-query'
import { fetchRelatedNfts } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'

const listClass =
  '-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5 lg:gap-6'
const itemClass = 'w-40 shrink-0 snap-start md:w-auto'

// "Mais desta coleção": faixa rolável no mobile, grade de 5 no desktop
export function RelatedNfts({ nftId }: { nftId: string }) {
  const related = useQuery({
    queryKey: nftKeys.related(nftId),
    queryFn: ({ signal }) => fetchRelatedNfts(nftId, signal),
    staleTime: 5 * 60_000,
  })

  // Seção complementar: se falhar, some sem atrapalhar a compra
  if (related.isError || related.data?.length === 0) return null

  return (
    <section aria-labelledby="mais-da-colecao" className="mt-12 lg:mt-20">
      <h2 id="mais-da-colecao" className="border-b border-border pb-2 text-body font-bold text-text-accent">
        Mais desta coleção
      </h2>
      {related.data ? (
        <ul className={`mt-6 ${listClass}`} aria-label="NFTs da mesma coleção">
          {related.data.map((nft) => (
            <li key={nft.id} className={itemClass}>
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={`mt-6 ${listClass}`} role="status" aria-label="Carregando NFTs da coleção">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={itemClass}>
              <NftCardSkeleton />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
