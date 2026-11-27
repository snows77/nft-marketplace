import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ApiRequestError } from '@/api/errors'
import type { Profile } from '@/contracts/auth'
import { AvatarImage } from './AccountLayout'
import { primaryButtonClass, textButtonClass } from './AccountField'
import { checkAvatarFile, resizeAvatar } from './avatar'
import { useUpdateProfile } from './hooks'

// Avatar: "Alterar" escolhe o arquivo e envia na hora; "Remover" volta ao ícone padrão
export function AvatarField({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const busy = preparing || update.isPending

  const send = (avatarUrl: string | null) =>
    update.mutate(
      { avatarUrl },
      {
        onSuccess: () => toast.success(avatarUrl ? 'Avatar atualizado.' : 'Avatar removido.'),
        onError: (err) =>
          setError(
            err instanceof ApiRequestError
              ? (err.fieldErrors?.avatarUrl?.[0] ?? err.message)
              : 'Algo deu errado. Tente novamente.',
          ),
      },
    )

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return

    const invalid = checkAvatarFile(file)
    setError(invalid)
    if (invalid) return

    setPreparing(true)
    try {
      send(await resizeAvatar(file))
    } catch {
      setError('Não foi possível ler esta imagem.')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-caption">Avatar</p>
      <div className="flex flex-wrap items-center gap-6">
        <AvatarImage src={profile.avatarUrl} className="size-12.5 shrink-0" />
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Escolher imagem do avatar"
          tabIndex={-1}
          className="sr-only"
          onChange={onFileChange}
        />
        <button
          type="button"
          aria-label="Alterar avatar"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(primaryButtonClass, 'px-6')}
        >
          {busy ? 'Enviando...' : 'Alterar'}
        </button>
        {profile.avatarUrl && (
          <button
            type="button"
            aria-label="Remover avatar"
            disabled={busy}
            onClick={() => {
              setError(null)
              send(null)
            }}
            className={cn(textButtonClass, 'font-normal text-foreground')}
          >
            Remover
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-2xs text-coral">
          {error}
        </p>
      )}
      <p className="text-2xs text-muted-foreground">PNG, JPG ou WebP, até 2 MB.</p>
    </div>
  )
}
