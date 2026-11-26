import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/Container'
import { useSession, useLogout } from '@/features/auth/session'

// PROVISÓRIA: mostra os dados da sessão para validar a proteção de rotas.
// A tela completa de perfil (edição, avatar, senha) vem no pedaço 8.
export const Route = createFileRoute('/_privado/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useSession()
  const logout = useLogout()
  if (!user) return null

  return (
    <Container className="max-w-xl space-y-6 py-12">
      <h1 className="text-heading font-bold">Meu perfil</h1>
      <dl className="space-y-3 rounded-lg bg-card p-6 text-body">
        <div>
          <dt className="text-caption text-muted-foreground">Nome de usuário</dt>
          <dd>{user.username}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">E-mail</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
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
