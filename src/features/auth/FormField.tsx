import { forwardRef, useId, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'h-11 w-full rounded border border-border-soft bg-transparent px-4 text-caption text-foreground placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-coral'

interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  revealable?: boolean // senha com botão de mostrar/ocultar
}

// Campo do Figma: só placeholder visível; o rótulo existe para leitores de tela
// e o erro fica ligado ao campo por aria-describedby
export const FormField = forwardRef<HTMLInputElement, FieldProps>(function FormField(
  { label, error, revealable, type, className, ...props },
  ref,
) {
  const id = useId()
  const errorId = `${id}-erro`
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={revealable ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, revealable && 'pr-11', className)}
          {...props}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-primary"
          >
            {visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-2xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
})
