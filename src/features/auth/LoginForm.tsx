import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginInputSchema, type LoginInput } from '@/contracts/auth'
import { notifyUnavailable } from '@/lib/unavailable'
import { FormField } from './FormField'
import { applyApiError } from './form-errors'
import { useLogin } from './session'
import { submitClass } from './styles'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess,
      onError: (err) => applyApiError(err, setError, ['email', 'password']),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      {errors.root?.server && (
        <p role="alert" className="rounded border border-coral/60 px-3 py-2 text-caption text-coral">
          {errors.root.server.message}
        </p>
      )}
      <FormField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label="Senha"
        revealable
        autoComplete="current-password"
        placeholder="Senha"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="text-right">
        <button type="button" onClick={notifyUnavailable} className="text-caption text-primary hover:underline">
          Esqueceu a senha?
        </button>
      </div>
      <button type="submit" disabled={login.isPending} className={submitClass}>
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
