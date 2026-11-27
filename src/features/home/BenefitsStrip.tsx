import { useId, useState } from 'react'
import { z } from 'zod'
import { notifyUnavailable } from '@/lib/unavailable'
import { BENEFITS } from './content'

const emailSchema = z.email('Informe um e-mail válido.')

// Faixa de vantagens + newsletter (Figma). A inscrição é fora do escopo: o e-mail é
// validado, mas o envio só avisa que não faz parte da demonstração (não finge sucesso).
export function BenefitsStrip() {
  const inputId = useId()
  const errorId = `${inputId}-erro`
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()

  return (
    <section aria-label="Vantagens da Kurio" className="grid gap-8 bg-card px-6 py-8 md:px-12 lg:grid-cols-[repeat(3,1fr)_1.2fr]">
      {BENEFITS.map((benefit) => (
        <div key={benefit.title} className="space-y-3 lg:border-r lg:border-primary lg:pr-6">
          <span
            aria-hidden="true"
            className="flex size-[74px] items-center justify-center rounded-full bg-primary text-title font-bold text-primary-foreground"
          >
            {benefit.letter}
          </span>
          <h2 className="text-title font-bold">{benefit.title}</h2>
          <p className="text-body text-tan">{benefit.text}</p>
        </div>
      ))}

      <form
        aria-label="Newsletter"
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const parsed = emailSchema.safeParse(email.trim())
          if (!parsed.success) {
            setError(parsed.error.issues[0].message)
            return
          }
          setError(undefined)
          notifyUnavailable()
        }}
      >
        <h2 className="text-title leading-tight font-bold">Antecipe-se ao próximo lançamento</h2>
        <div className="flex">
          <label htmlFor={inputId} className="sr-only">
            E-mail para novidades
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="digite seu e-mail..."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-10 min-w-0 flex-1 rounded-l bg-surface-dark px-4 text-body placeholder:text-tan aria-invalid:outline aria-invalid:outline-coral"
          />
          <button
            type="submit"
            className="rounded-r bg-primary px-4 text-title font-bold text-primary-foreground hover:bg-primary-light"
          >
            Enviar
          </button>
        </div>
        {error && (
          <p id={errorId} className="text-caption text-coral">
            {error}
          </p>
        )}
        <p className="text-caption text-tan">
          Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
        </p>
      </form>
    </section>
  )
}
