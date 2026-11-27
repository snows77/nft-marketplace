import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { changePasswordInputSchema, type ChangePasswordInput } from '@/contracts/auth'
import { applyApiError } from '@/features/auth/form-errors'
import { AccountField, FormAlert, primaryButtonClass } from './AccountField'
import { useChangePassword } from './hooks'

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const
const EMPTY: ChangePasswordInput = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordForm() {
  const change = useChangePassword()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordInputSchema), defaultValues: EMPTY })

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => {
        reset(EMPTY)
        toast.success('Senha alterada.')
      },
      onError: (err) => applyApiError(err, setError, FIELDS),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="alterar-senha-titulo" className="space-y-5 md:max-w-[calc(50%-14px)]">
      <h2 id="alterar-senha-titulo" className="text-body font-bold">
        Alterar senha
      </h2>
      <FormAlert message={errors.root?.server?.message} />
      <AccountField
        label="Senha atual"
        revealable
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <AccountField
        label="Nova senha"
        revealable
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <AccountField
        label="Confirmar nova senha"
        revealable
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <button type="submit" disabled={change.isPending} className={primaryButtonClass}>
        {change.isPending ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
