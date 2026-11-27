import { createFileRoute, Link } from '@tanstack/react-router'
import { Container } from '@/components/layout/Container'
import { NftGrid, NftGridSkeleton } from '@/features/catalog/NftGrid'
import { useFavoritesQuery } from '@/features/favorites/hooks'

// Favoritos do colecionador (privado): mesma grade de cards do catálogo
export const Route = createFileRoute('/_privado/favoritos')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const favorites = useFavoritesQuery()

  return (
    <Container className="py-6 lg:py-8">
      <h1 className="text-heading font-bold">Favoritos</h1>
      <p className="mt-1 text-caption text-muted-foreground">NFTs que você guardou para ver depois.</p>

      <div className="mt-6">
        {favorites.isPending && <NftGridSkeleton label="Carregando favoritos" count={3} />}
        {favorites.isError && (
          <div role="alert" className="space-y-2 text-caption">
            <p>Não foi possível carregar seus favoritos.</p>
            <button type="button" className="font-bold text-primary underline" onClick={() => favorites.refetch()}>
              Tentar de novo
            </button>
          </div>
        )}
        {favorites.data &&
          (favorites.data.items.length > 0 ? (
            <NftGrid items={favorites.data.items} />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded bg-card p-6">
              <p className="text-body">Você ainda não tem favoritos.</p>
              <Link to="/" hash="catalogo" className="font-bold text-primary underline">
                Explorar o catálogo
              </Link>
            </div>
          ))}
      </div>
    </Container>
  )
}
