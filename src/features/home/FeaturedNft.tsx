import type { NftSummary } from '@/contracts/nft'
import { formatTokenNumber } from '@/lib/format'
import { srcSetFor } from '@/lib/images'

// Card "NFT EM DESTAQUE / OFERTA LIMITADA" da barra lateral (Figma desktop)
export function FeaturedNft({ nft }: { nft: NftSummary | undefined }) {
  return (
    <aside aria-label="NFT em destaque" className="bg-card pt-6">
      <p className="px-5 text-heading font-bold text-primary">NFT EM DESTAQUE</p>
      <p className="mt-2 text-center text-title font-bold">OFERTA LIMITADA</p>
      {nft ? (
        // Rota de detalhe chega no pedaço 4
        <a href={`/nft/${nft.id}`} className="mt-3 block overflow-hidden rounded-3xl">
          <img
            // sizes antes de srcSet/src: o React aplica os atributos em ordem e a imagem
            // começaria a baixar sem saber o tamanho de exibição (pegando a maior)
            sizes="310px"
            src={nft.image}
            srcSet={srcSetFor(nft.image)}
            alt={`${nft.name} ${formatTokenNumber(nft.tokenNumber)}`}
            width={310}
            height={365}
            loading="lazy"
            className="aspect-[310/365] w-full object-cover transition-transform duration-300 hover:scale-[1.02] motion-reduce:transition-none"
          />
        </a>
      ) : (
        <div className="skeleton mt-3 aspect-[310/365] rounded-3xl" aria-hidden="true" />
      )}
    </aside>
  )
}
