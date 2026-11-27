import { createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/AccountLayout'
import { PasswordForm } from '@/features/account/PasswordForm'
import { ProfileForm } from '@/features/account/ProfileForm'
import { useProfileQuery } from '@/features/account/hooks'

// Perfil do colecionador: dados, avatar e alteração de senha
export const Route = createFileRoute('/_privado/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const profile = useProfileQuery()

  return (
    <AccountLayout>
      <div className="space-y-8">
        <h2 className="text-body font-bold">Perfil do colecionador</h2>
        {profile.isPending && (
          <div role="status" aria-label="Carregando perfil" className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-16 rounded" />
            ))}
          </div>
        )}
        {profile.isError && (
          <div role="alert" className="space-y-2 text-caption">
            <p>Não foi possível carregar seu perfil.</p>
            <button type="button" className="font-bold text-primary underline" onClick={() => profile.refetch()}>
              Tentar de novo
            </button>
          </div>
        )}
        {profile.data && (
          <>
            <ProfileForm profile={profile.data} />
            <PasswordForm />
          </>
        )}
      </div>
    </AccountLayout>
  )
}
