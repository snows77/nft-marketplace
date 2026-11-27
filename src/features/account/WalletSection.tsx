import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  NETWORK_LABELS,
  PROVIDER_LABELS,
  SLOT_LABELS,
  shortAddress,
  walletInputSchema,
  type Wallet,
  type WalletFormValues,
  type WalletInput,
  type WalletSlot,
} from '@/contracts/wallet'
import { applyApiError } from '@/features/auth/form-errors'
import { AccountField, AccountSelect, FormAlert, primaryButtonClass, textButtonClass } from './AccountField'
import { useSaveWallet } from './hooks'

const FIELDS = ['label', 'provider', 'network', 'address'] as const
const NETWORK_OPTIONS = Object.entries(NETWORK_LABELS).map(([value, label]) => ({ value, label }))
const PROVIDER_OPTIONS = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }))

interface WalletSectionProps {
  slot: WalletSlot
  wallet: Wallet | null
  description?: string
}

// Uma carteira (principal ou secundária): resumo, estado vazio ou formulário de edição
export function WalletSection({ slot, wallet, description }: WalletSectionProps) {
  const headingId = useId()
  const [editing, setEditing] = useState(false)
  const actionRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)

  // Ao fechar o formulário, o foco volta para o botão que o abriu
  useEffect(() => {
    if (wasEditing.current && !editing) actionRef.current?.focus()
    wasEditing.current = editing
  }, [editing])

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id={headingId} className="text-body font-bold">
            {SLOT_LABELS[slot]}
          </h2>
          {description && <p className="text-2xs text-muted-foreground md:text-caption">{description}</p>}
        </div>
        {!editing && (
          <button ref={actionRef} type="button" onClick={() => setEditing(true)} className={cn(textButtonClass, 'h-auto')}>
            {wallet ? 'Editar' : 'Adicionar'}
          </button>
        )}
      </div>

      {editing ? (
        <WalletForm slot={slot} wallet={wallet} onDone={() => setEditing(false)} />
      ) : wallet ? (
        <WalletCard wallet={wallet} />
      ) : (
        <p className="text-caption text-muted-foreground">
          Você ainda não adicionou uma {SLOT_LABELS[slot].toLowerCase()}.
        </p>
      )}
    </section>
  )
}

function WalletCard({ wallet }: { wallet: Wallet }) {
  return (
    <div className="rounded bg-card px-5 py-4">
      <p className="text-body font-bold">{wallet.label}</p>
      <p className="text-caption text-muted-foreground" title={wallet.address}>
        <span aria-hidden="true">{shortAddress(wallet.address)}</span>
        <span className="sr-only">Endereço {wallet.address}</span>
      </p>
      <p className="text-caption text-muted-foreground">
        {PROVIDER_LABELS[wallet.provider]} · Rede {NETWORK_LABELS[wallet.network]}
      </p>
    </div>
  )
}

function WalletForm({ slot, wallet, onDone }: { slot: WalletSlot; wallet: Wallet | null; onDone: () => void }) {
  const save = useSaveWallet()
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<WalletFormValues, unknown, WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: {
      label: wallet?.label ?? '',
      provider: wallet?.provider ?? '',
      network: wallet?.network ?? '',
      address: wallet?.address ?? '',
    },
  })

  // Abrir o formulário leva o foco ao primeiro campo
  useEffect(() => setFocus('label'), [setFocus])

  const onSubmit = handleSubmit((input) =>
    save.mutate(
      { slot, input },
      {
        onSuccess: () => {
          toast.success(`${SLOT_LABELS[slot]} salva.`)
          onDone()
        },
        onError: (err) => applyApiError(err, setError, FIELDS),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={errors.root?.server?.message} />
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <AccountField
          label="Apelido da carteira"
          required
          placeholder="Ex.: Reserva"
          error={errors.label?.message}
          {...register('label')}
        />
        <AccountSelect
          label="Rede"
          required
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
          error={errors.network?.message}
          {...register('network')}
        />
        <AccountField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          error={errors.address?.message}
          {...register('address')}
        />
        <AccountSelect
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          error={errors.provider?.message}
          {...register('provider')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={save.isPending} className={cn(primaryButtonClass, 'px-4')}>
          {save.isPending ? 'Salvando...' : 'Salvar carteira'}
        </button>
        <button type="button" onClick={onDone} disabled={save.isPending} className={textButtonClass}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
