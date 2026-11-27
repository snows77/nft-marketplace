import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiRequestError } from '@/api/errors'
import { addFavorite, fetchFavorites, removeFavorite } from '@/api/favorites'
import { favoriteKeys } from '@/api/queryKeys'
import type { FavoritesResponse } from '@/contracts/favorite'
import type { NftSummary } from '@/contracts/nft'
import { useSession } from '@/features/auth/session'

// Lista de favoritos do usuário logado. Serve tanto para a página /favoritos quanto
// para saber se um NFT está favoritado (coração do card e do detalhe).
// A chave inclui o id do usuário: favoritos de uma pessoa nunca aparecem para outra.
export function useFavoritesQuery() {
  const { user } = useSession()
  return useQuery({
    queryKey: favoriteKeys.list(user?.id ?? 'anonimo'),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: user != null,
    staleTime: 60_000,
  })
}

const toggleKey = (nftId: string) => ['favorites', 'toggle', nftId] as const

function withItem(data: FavoritesResponse, nft: NftSummary, favorite: boolean): FavoritesResponse {
  const others = data.items.filter((item) => item.id !== nft.id)
  return { items: favorite ? [nft, ...others] : others }
}

// Favoritar/desfavoritar com ATUALIZAÇÃO OTIMISTA E ROLLBACK (requisito do desafio):
// 1. onMutate: cancela buscas da lista em andamento (para uma resposta antiga não
//    sobrescrever a mudança) e aplica a mudança no cache na hora, via setQueryData;
// 2. onError: desfaz só a mudança deste NFT (não o snapshot inteiro, para não apagar
//    outro favorito alterado ao mesmo tempo) e avisa com um toast de erro;
// 3. onSettled: invalida a lista, que é reconciliada com a API em segundo plano.
// Cliques repetidos não disputam entre si: enquanto há uma mutation deste NFT em
// andamento (em qualquer botão da tela), o coração fica indisponível (useIsMutating).
export function useToggleFavorite(nft: NftSummary) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = favoriteKeys.list(user?.id ?? 'anonimo')
  const pending = useIsMutating({ mutationKey: toggleKey(nft.id) }) > 0

  const mutation = useMutation({
    mutationKey: toggleKey(nft.id),
    mutationFn: (favorite: boolean) => (favorite ? addFavorite(nft.id) : removeFavorite(nft.id)),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<FavoritesResponse>(key, (data) => data && withItem(data, nft, favorite))
    },
    onError: (error, favorite) => {
      queryClient.setQueryData<FavoritesResponse>(key, (data) => data && withItem(data, nft, !favorite))
      // Sessão expirada já tem aviso e fluxo próprios (abre o login)
      if (error instanceof ApiRequestError && error.code === 'SESSION_EXPIRED') return
      toast.error('Não foi possível atualizar seus favoritos.')
    },
    onSuccess: (_data, favorite) => {
      toast.success(favorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', { id: `favorito-${nft.id}` })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { toggle: mutation.mutate, pending }
}
