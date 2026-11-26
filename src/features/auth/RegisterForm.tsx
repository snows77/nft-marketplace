import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerInputSchema, type RegisterInput } from '@/contracts/auth'
import { FormField } from './FormField'
import { applyApiError } from './form-errors'
import { useRegister } from './session'
import { submitClass } from './styles'

const FIELDS = ['username', 'email', 'password', 'confirmPassword'] as const

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const registerUser = useRegister()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit((values) =>
    registerUser.mutate(values, {
      onSuccess,
      onError: (err) => applyApiError(err, setError, FIELDS),
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
        label="Nome de usuário"
        autoComplete="username"
        placeholder="Nome de usuário"
        error={errors.username?.message}
        {...register('username')}
      />
      <FormField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label="Senha"
        revealable
        autoComplete="new-password"
        placeholder="Senha"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormField
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <button type="submit" disabled={registerUser.isPending} className={submitClass}>
        {registerUser.isPending ? (
          'Criando conta...'
        ) : (
          // Texto do Figma: "Criar perfil" no mobile, "Criar conta" no desktop
          <>
            <span className="md:hidden">Criar perfil</span>
            <span className="hidden md:inline">Criar conta</span>
          </>
        )}
      </button>
    </form>
  )
}
