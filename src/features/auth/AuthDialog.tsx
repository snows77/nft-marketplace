import { useId } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { notifyUnavailable } from '@/lib/unavailable'
import { safeRedirect } from '@/lib/safe-redirect'
import { FacebookBrandIcon, GoogleIcon } from './BrandIcons'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Mode = 'entrar' | 'cadastro'

const COPY: Record<Mode, { title: string; mobileTitle: string; description: string }> = {
  entrar: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil criador.',
  },
  cadastro: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

const socialClass =
  'flex h-10 w-full items-center justify-center gap-3 rounded border border-border-soft text-caption hover:border-primary'

// Modal de login/cadastro do Figma. Abre por ?auth=entrar|cadastro sobre a página atual,
// para a pessoa voltar exatamente para onde estava. No mobile ocupa a tela inteira.
export function AuthDialog() {
  const search = useSearch({ strict: false }) as { auth?: Mode; redirect?: string }
  const navigate = useNavigate()
  const panelId = useId()
  const mode = search.auth
  const copy = COPY[mode ?? 'entrar']

  function setMode(next: Mode | undefined) {
    navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        auth: next,
        redirect: next ? prev.redirect : undefined,
      }),
      replace: true,
    })
  }

  function onAuthenticated() {
    if (search.redirect) navigate({ href: safeRedirect(search.redirect), replace: true })
    else setMode(undefined)
  }

  return (
    <Dialog open={mode !== undefined} onOpenChange={(open) => !open && setMode(undefined)}>
      <DialogContent
        // Ao abrir, o foco vai para o primeiro campo (e não para as abas)
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input')?.focus()
        }}
        className={cn(
          'gap-0 overflow-y-auto bg-card p-0 text-foreground ring-0',
          // mobile: tela cheia
          'inset-0 h-dvh max-h-dvh max-w-none translate-x-0 translate-y-0 rounded-none',
          // desktop: modal de 500px com a faixa laranja embaixo (Figma)
          'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[90dvh] md:w-[500px] md:max-w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:border-b-8 md:border-primary',
          '[&>[data-slot=dialog-close]]:text-primary',
        )}
      >
        <div className="mx-auto flex w-full max-w-[340px] flex-col px-4 pt-16 pb-10 md:max-w-none md:px-20 md:pt-12">
          <p className="mb-24 text-center text-heading font-bold tracking-[0.2em] md:hidden" aria-hidden="true">
            KURIO
          </p>

          {/* Título: abas no desktop, texto simples no mobile */}
          <DialogTitle className="mb-8 text-center text-title font-bold md:sr-only">
            <span className="md:hidden">{copy.mobileTitle}</span>
            <span className="hidden md:inline">{copy.title}</span>
          </DialogTitle>

          <div role="tablist" aria-label="Acesso" className="mb-8 hidden items-center justify-center gap-2 text-title md:flex">
            {(['entrar', 'cadastro'] as const).map((tab, index) => (
              <span key={tab} className="flex items-center gap-2">
                {index === 1 && <span className="h-6 w-px bg-primary" aria-hidden="true" />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  aria-controls={panelId}
                  onClick={() => setMode(tab)}
                  className={cn('font-bold', mode === tab ? 'text-primary' : 'text-foreground hover:text-primary')}
                >
                  {COPY[tab].title}
                </button>
              </span>
            ))}
          </div>

          <DialogDescription className="mb-8 hidden text-center text-caption text-foreground md:block">
            {copy.description}
          </DialogDescription>

          <div id={panelId} role="tabpanel">
            {mode === 'cadastro' ? (
              <RegisterForm onSuccess={onAuthenticated} />
            ) : (
              <LoginForm onSuccess={onAuthenticated} />
            )}
          </div>

          <div className="my-6 flex items-center gap-3 text-caption md:-mx-20" aria-hidden="true">
            <span className="h-px flex-1 bg-border-soft" />
            Ou continue com
            <span className="h-px flex-1 bg-border-soft" />
          </div>
          <div className="space-y-3">
            <button type="button" onClick={notifyUnavailable} className={socialClass}>
              <GoogleIcon />
              Continuar com Google
            </button>
            <button type="button" onClick={notifyUnavailable} className={socialClass}>
              <FacebookBrandIcon />
              Continuar com Facebook
            </button>
          </div>

          <p className="mt-12 text-center text-caption md:hidden">
            {mode === 'cadastro' ? (
              <>
                Já tem uma conta?{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('entrar')}>
                  Entre
                </button>
              </>
            ) : (
              <>
                Novo na Kurio?{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('cadastro')}>
                  Crie uma conta
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
