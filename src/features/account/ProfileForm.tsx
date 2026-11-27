import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { profileDataInputSchema, type Profile, type ProfileDataInput } from '@/contracts/auth'
import { applyApiError } from '@/features/auth/form-errors'
import { AccountField, FormAlert, controlClass, primaryButtonClass } from './AccountField'
import { AvatarField } from './AvatarField'
import { useUpdateProfile } from './hooks'

const FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname'] as const

function toValues(profile: Profile): ProfileDataInput {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName ?? '',
    walletNickname: profile.walletNickname,
  }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ProfileDataInput>({
    resolver: zodResolver(profileDataInputSchema),
    defaultValues: toValues(profile),
  })

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (saved) => {
        reset(toValues(saved))
        toast.success('Perfil atualizado.')
      },
      onError: (err) => applyApiError(err, setError, FIELDS),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={errors.root?.server?.message} />
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <AccountField
          label="Nome de exibição"
          required
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <AccountField
          label="Nome de usuário"
          required
          autoComplete="username"
          autoCapitalize="none"
          error={errors.username?.message}
          {...register('username')}
        />
        <AccountField
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <AccountField
          label="Nome ENS"
          autoCapitalize="none"
          placeholder="seunome"
          error={errors.ensName?.message}
          addon={
            // Só o domínio .eth é suportado na demonstração
            <select aria-label="Domínio ENS" className={cn(controlClass, 'w-21 shrink-0 bg-background px-2.5')}>
              <option value="eth">.eth</option>
            </select>
          }
          {...register('ensName')}
        />
        <AccountField
          label="Apelido da carteira"
          required
          error={errors.walletNickname?.message}
          {...register('walletNickname')}
        />
        <AvatarField profile={profile} />
      </div>
      <button type="submit" disabled={update.isPending} className={primaryButtonClass}>
        {update.isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
