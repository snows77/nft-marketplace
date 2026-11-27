import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, fetchProfile, updateProfile } from '@/api/profile'
import { profileKeys, walletKeys } from '@/api/queryKeys'
import { fetchWallets, saveWallet } from '@/api/wallets'
import type { Profile, Session } from '@/contracts/auth'
import type { WalletInput, WalletSlot, WalletsResponse } from '@/contracts/wallet'
import { sessionKey, useSession } from '@/features/auth/session'

// Chaves privadas sempre com o id do usuário da sessão (isolamento entre usuários).
// As páginas que usam estes hooks ficam atrás de /_privado, então há sessão.
function useUserId(): string {
  const { user } = useSession()
  return user?.id ?? 'anonimo'
}

export function useProfileQuery() {
  const userId = useUserId()
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: userId !== 'anonimo',
  })
}

// Dados do perfil e avatar. A resposta da API é a fonte da verdade: vai para o cache do
// perfil e atualiza o usuário da sessão (nome e avatar no cabeçalho).
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.id), profile)
      queryClient.setQueryData<Session | null>(sessionKey, (session) =>
        session && session.user.id === profile.id
          ? {
              ...session,
              user: {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
              },
            }
          : session,
      )
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}

export function useWalletsQuery() {
  const userId = useUserId()
  return useQuery({
    queryKey: walletKeys.list(userId),
    queryFn: ({ signal }) => fetchWallets(signal),
    enabled: userId !== 'anonimo',
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: WalletInput }) => saveWallet(slot, input),
    onSuccess: (wallet) => {
      const key = walletKeys.list(userId)
      queryClient.setQueryData<WalletsResponse>(key, (prev) => prev && { ...prev, [wallet.slot]: wallet })
      // Confere com a API (e com outras abas) em segundo plano
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
