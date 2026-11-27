import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Campos das telas de conta (perfil e carteiras). Diferente do modal de login, o Figma
// mostra o rótulo visível acima do campo, com * nos obrigatórios.
export const controlClass =
  'h-10 w-full rounded border border-border-soft bg-transparent px-3 text-caption text-foreground placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-coral'

function FieldLabel({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <div className="flex items-baseline gap-0.5 text-caption text-foreground">
      <label htmlFor={htmlFor}>{label}</label>
      {/* O * é visual (fora do rótulo, para não entrar no nome do campo);
          para leitores de tela vale o aria-required */}
      {required && (
        <span aria-hidden="true" className="text-coral">
          *
        </span>
      )}
    </div>
  )
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={id} className="text-2xs text-coral">
      {error}
    </p>
  )
}

interface InputFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  revealable?: boolean // senha com botão de mostrar/ocultar
  addon?: ReactNode // controle antes do campo (ex.: o ".eth" do ENS)
}

export const AccountField = forwardRef<HTMLInputElement, InputFieldProps>(function AccountField(
  { label, error, revealable, addon, required, type, className, ...props },
  ref,
) {
  const id = useId()
  const errorId = `${id}-erro`
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="flex gap-2.5">
        {addon}
        <div className="relative min-w-0 flex-1">
          <input
            ref={ref}
            id={id}
            type={revealable ? (visible ? 'text' : 'password') : type}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(controlClass, revealable && 'pr-11', className)}
            {...props}
          />
          {revealable && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={visible}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-primary hover:text-primary-light"
            >
              {visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  )
})

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string
  error?: string
  placeholder: string
  options: { value: string; label: string }[]
}

export const AccountSelect = forwardRef<HTMLSelectElement, SelectFieldProps>(function AccountSelect(
  { label, error, placeholder, options, required, className, ...props },
  ref,
) {
  const id = useId()
  const errorId = `${id}-erro`

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(controlClass, 'appearance-none bg-background pr-10', className)}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
        />
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  )
})

// Botões das telas de conta, no estilo do Figma
export const primaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded bg-primary px-10 text-caption font-bold text-primary-foreground hover:bg-primary-light disabled:cursor-wait disabled:opacity-70'

export const textButtonClass =
  'inline-flex h-10 items-center rounded px-2 text-caption font-bold text-primary hover:underline disabled:cursor-wait disabled:opacity-70'

// Mensagem geral do formulário (erro que não pertence a um campo)
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded border border-coral/60 px-3 py-2 text-caption text-coral">
      {message}
    </p>
  )
}
