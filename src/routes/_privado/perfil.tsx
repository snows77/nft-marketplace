import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Container } from '@/components/layout/Container'
import { fetchProfile } from '@/api/profile'
import { profileKeys } from '@/api/queryKeys'
import { useSession, useLogout } from '@/features/auth/session'

// PROVISÓRIA: mostra o perfil vindo da API para validar a proteção de rotas e o
// isolamento por usuário. A tela completa (edição, avatar, senha) vem no pedaço 8.
export const Route = createFileRoute('/_privado/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useSession()
  const logout = useLogout()
  const profile = useQuery({
    queryKey: profileKeys.detail(user?.id ?? 'anonimo'),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: !!user,
  })

  return (
    <Container className="max-w-xl space-y-6 py-12">
      <h1 className="text-heading font-bold">Meu perfil</h1>
      {profile.isPending && <div className="skeleton h-28 rounded-lg" role="status" aria-label="Carregando perfil" />}
      {profile.isError && (
        <div role="alert" className="space-y-2">
          <p>Não foi possível carregar seu perfil.</p>
          <button type="button" className="text-primary underline" onClick={() => profile.refetch()}>
            Tentar de novo
          </button>
        </div>
      )}
      {profile.data && (
        <dl className="space-y-3 rounded-lg bg-card p-6 text-body">
          <div>
            <dt className="text-caption text-muted-foreground">Nome de usuário</dt>
            <dd>{profile.data.username}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">E-mail</dt>
            <dd>{profile.data.email}</dd>
          </div>
        </dl>
      )}
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="rounded border border-primary px-6 py-2.5 font-bold text-primary hover:bg-primary hover:text-primary-foreground"
      >
        Sair
      </button>
    </Container>
  )
}
