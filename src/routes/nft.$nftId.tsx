import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ApiRequestError } from '@/api/errors'
import { fetchNft } from '@/api/nfts'
import { nftKeys } from '@/api/queryKeys'
import { Container } from '@/components/layout/Container'
import { NftDetail, NftDetailSkeleton } from '@/features/detail/NftDetail'
import { RelatedNfts } from '@/features/detail/RelatedNfts'
import { formatTokenNumber } from '@/lib/format'

// Detalhe do NFT. Funciona em acesso direto (a busca acontece aqui, não depende do
// catálogo já estar em cache) e trata NFT inexistente (404) com uma página própria.
export const Route = createFileRoute('/nft/$nftId')({
  component: NftPage,
})

function NftPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery({
    queryKey: nftKeys.detail(nftId),
    queryFn: ({ signal }) => fetchNft(nftId, signal),
  })

  useEffect(() => {
    if (!nft.data) return
    const previous = document.title
    document.title = `${nft.data.name} ${formatTokenNumber(nft.data.tokenNumber)} | Kurio`
    return () => {
      document.title = previous
    }
  }, [nft.data])

  // Leva o topo da página ao trocar de NFT (ex.: clique em "Mais desta coleção")
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [nftId])

  const notFound = nft.error instanceof ApiRequestError && nft.error.code === 'NOT_FOUND'

  return (
    <Container className="py-4 lg:py-8">
      {nft.isPending && <NftDetailSkeleton />}
      {notFound && <NftNotFound />}
      {nft.isError && !notFound && (
        <div role="alert" className="flex flex-col items-start gap-2 py-16 text-body">
          <p>Não foi possível carregar este NFT.</p>
          <button type="button" className="font-bold text-primary underline" onClick={() => nft.refetch()}>
            Tentar de novo
          </button>
        </div>
      )}
      {nft.data && (
        <>
          <NftDetail nft={nft.data} />
          <RelatedNfts nftId={nft.data.id} />
        </>
      )}
    </Container>
  )
}

function NftNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-heading font-bold">NFT não encontrado</h1>
      <p className="max-w-md text-body text-muted-foreground">
        Este NFT não existe ou foi removido do mercado. Que tal explorar outros do catálogo?
      </p>
      <Link
        to="/"
        hash="catalogo"
        className="rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground hover:bg-primary-light"
      >
        Voltar ao catálogo
      </Link>
    </div>
  )
}
